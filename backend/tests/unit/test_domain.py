from decimal import Decimal

import pytest

from app.domain.entities import ShippingInfo
from app.domain.errors import InvalidTransition, OutOfStock, ValidationError
from app.domain.order_status import OrderStatus, allowed_transitions, ensure_transition, returns_stock
from app.domain.pricing import PricingPolicy, compute_totals
from app.domain.stock import apply_delta, availability, ensure_available
from app.domain.validation import password_errors, validate_shipping

POLICY = PricingPolicy(Decimal("0.19"), 12000, 250000)


# ---------- totals ----------
def test_empty_cart_has_no_shipping():
    t = compute_totals([], POLICY)
    assert (t.total_items_cop, t.tax_cop, t.shipping_cop, t.total_cop) == (0, 0, 0, 0)


def test_tax_is_included_in_price():
    t = compute_totals([(119000, 1)], POLICY)
    assert t.tax_cop == 19000 and t.subtotal_cop == 100000 and t.total_items_cop == 119000
    assert t.shipping_cop == 12000 and t.total_cop == 131000


@pytest.mark.parametrize("price,expected_shipping", [(249999, 12000), (250000, 0), (250001, 0)])
def test_free_shipping_threshold(price, expected_shipping):
    t = compute_totals([(price, 1)], POLICY)
    assert t.shipping_cop == expected_shipping and t.total_cop == price + expected_shipping


def test_tax_rounding_and_sum_invariant():
    for price in (89000, 123457, 189000, 690000):
        for qty in (1, 2, 3):
            t = compute_totals([(price, qty)], POLICY)
            assert t.subtotal_cop + t.tax_cop == t.total_items_cop
            assert isinstance(t.tax_cop, int)
    assert compute_totals([(120000, 1)], POLICY).tax_cop == 19160  # 19159.66 rounds up


def test_multiple_lines_sum():
    t = compute_totals([(100000, 2), (50000, 1)], POLICY)
    assert t.total_items_cop == 250000 and t.shipping_cop == 0 and t.free_shipping_from_cop == 250000


def test_custom_policy():
    t = compute_totals([(1000, 1)], PricingPolicy(Decimal("0"), 500, 5000))
    assert t.tax_cop == 0 and t.shipping_cop == 500 and t.total_cop == 1500


# ---------- state machine ----------
VALID = {
    ("pending", "paid"), ("pending", "cancelled"), ("paid", "preparing"), ("paid", "cancelled"),
    ("preparing", "shipped"), ("preparing", "cancelled"), ("shipped", "delivered"),
}


@pytest.mark.parametrize("src", [s.value for s in OrderStatus])
@pytest.mark.parametrize("dst", [s.value for s in OrderStatus])
def test_transition_matrix(src, dst):
    if (src, dst) in VALID and (src, dst) != ("pending", "paid"):
        assert ensure_transition(src, dst) == OrderStatus(dst)
    elif (src, dst) == ("pending", "paid"):
        with pytest.raises(InvalidTransition):
            ensure_transition(src, dst)  # only a payment can do this
        assert ensure_transition(src, dst, manual=False) is OrderStatus.PAID
    else:
        with pytest.raises(InvalidTransition):
            ensure_transition(src, dst)


def test_terminal_states_have_no_exits():
    assert allowed_transitions("delivered") == [] and allowed_transitions("cancelled") == []
    assert allowed_transitions("paid") == [OrderStatus.PREPARING, OrderStatus.CANCELLED]


def test_only_paid_or_preparing_cancellation_returns_stock():
    assert returns_stock("paid", "cancelled") and returns_stock("preparing", "cancelled")
    assert not returns_stock("pending", "cancelled")
    assert not returns_stock("paid", "preparing")


def test_invalid_transition_message_is_spanish():
    with pytest.raises(InvalidTransition) as exc:
        ensure_transition("shipped", "cancelled")
    assert "Enviado" in exc.value.message and "Cancelado" in exc.value.message


# ---------- stock ----------
def test_stock_never_negative():
    assert apply_delta(5, -5) == 0
    with pytest.raises(OutOfStock):
        apply_delta(2, -3)
    with pytest.raises(OutOfStock):
        apply_delta(0, -1)


def test_ensure_available():
    ensure_available(3, 3)
    with pytest.raises(OutOfStock) as exc:
        ensure_available(4, 3)
    assert exc.value.details["available"] == 3


@pytest.mark.parametrize("stock,expected", [(0, "out_of_stock"), (1, "low_stock"), (3, "low_stock"),
                                            (4, "in_stock"), (-2, "out_of_stock")])
def test_availability(stock, expected):
    assert availability(stock, 3) == expected


# ---------- validation ----------
def ship(**over):
    data = dict(full_name="Ana Pérez", phone="3101234567", address_line="Calle 1 # 2-3", city="Pasto",
                department="Nariño", postal_code="520001")
    data.update(over)
    return ShippingInfo(**data)


def test_valid_shipping_is_normalised():
    s = validate_shipping(ship(department="  narino ", phone="310 123-4567"))
    assert s.department == "Nariño" and s.phone == "3101234567"


@pytest.mark.parametrize("field,value,key", [
    ("postal_code", "12345", "postalCode"), ("postal_code", "12345a", "postalCode"), ("phone", "31012345678", "phone"),
    ("phone", "123", "phone"), ("department", "Atlantis", "department"), ("full_name", "A", "fullName"),
    ("address_line", "x", "addressLine"),
])
def test_invalid_shipping(field, value, key):
    with pytest.raises(ValidationError) as exc:
        validate_shipping(ship(**{field: value}))
    assert key in exc.value.details["fields"]


def test_password_rules():
    assert password_errors("Abcdefg1") == {}
    assert password_errors("short1")
    assert password_errors("soloLetrasAqui")
    assert password_errors("12345678")
