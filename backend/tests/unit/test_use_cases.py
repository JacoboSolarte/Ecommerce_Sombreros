import pytest

from app.application.use_cases.admin_inventory import AdjustStock
from app.application.use_cases.admin_orders import TransitionOrder
from app.application.use_cases.auth import AuthenticateToken, LoginUser, LogoutUser, RegisterUser
from app.application.use_cases.cart import AddToCart, MergeCart, QuoteCart, UpdateCartItem
from app.application.use_cases.checkout import Checkout
from app.application.use_cases.payments import RetryPayment, SimulatePayment
from app.domain.entities import ShippingInfo, User
from app.domain.errors import (
    CartEmpty, EmailTaken, InvalidCredentials, InvalidTransition, NotAuthenticated, NotFound, OutOfStock,
    PaymentError, ValidationError,
)
from tests.unit.fakes import FakeGateway, FakeHasher, FakeTokens, FakeUoW, FixedClock, Store, make_config

SHIP = ShippingInfo("Ana Pérez", "3101234567", "Calle 1 # 2-3", "Pasto", "Nariño", "520001")


@pytest.fixture
def store():
    s = Store()
    s.add_variant(1, price=100000, stock=5)
    s.add_variant(2, price=200000, stock=1, name="Raro", product_id=2)
    return s


@pytest.fixture
def uow(store):
    return lambda: FakeUoW(store)


@pytest.fixture
def user(store):
    return FakeUoW(store).users.add(User(None, "a@b.co", "hashed:Segura123", "Ana"))


@pytest.fixture
def admin(store):
    return FakeUoW(store).users.add(User(None, "admin@b.co", "x", "Admin", role="admin"))


CLOCK, CONFIG = FixedClock(), make_config()


# ---------- auth ----------
def test_register_login_logout_cycle(uow, store):
    tokens = FakeTokens()
    registered, issued = RegisterUser(uow, FakeHasher(), tokens, CLOCK)(full_name="Luz", email=" Luz@X.co ", password="Segura123")
    assert registered.email == "luz@x.co" and store.users[registered.id].password_hash == "hashed:Segura123"

    with pytest.raises(EmailTaken):
        RegisterUser(uow, FakeHasher(), tokens, CLOCK)(full_name="Otra", email="luz@x.co", password="Segura123")
    with pytest.raises(ValidationError):
        RegisterUser(uow, FakeHasher(), tokens, CLOCK)(full_name="Otra", email="otra@x.co", password="debil")

    user, token = LoginUser(uow, FakeHasher(), tokens)(email="LUZ@x.co", password="Segura123")
    auth = AuthenticateToken(uow, tokens)
    assert auth(token.token).id == user.id
    LogoutUser(uow)(auth.claims(token.token))
    with pytest.raises(NotAuthenticated):
        auth(token.token)
    assert auth(issued.token).id == user.id  # other sessions are unaffected


def test_login_failures(uow, user):
    login = LoginUser(uow, FakeHasher(), FakeTokens())
    with pytest.raises(InvalidCredentials):
        login(email="a@b.co", password="Mala12345")
    with pytest.raises(InvalidCredentials):
        login(email="nadie@b.co", password="Segura123")


def test_inactive_user_cannot_authenticate(uow, store, user):
    store.users[user.id].is_active = False
    tokens = FakeTokens()
    with pytest.raises(NotAuthenticated):
        AuthenticateToken(uow, tokens)(tokens.issue(user.id, "customer").token)


# ---------- cart ----------
def test_add_to_cart_respects_stock(uow, user):
    add = AddToCart(uow, CLOCK, CONFIG)
    assert add(user, 1, 3).items[0].quantity == 3
    assert add(user, 1, 2).items[0].quantity == 5
    with pytest.raises(OutOfStock) as exc:
        add(user, 1, 1)
    assert exc.value.details["available"] == 5
    with pytest.raises(NotFound):
        add(user, 99, 1)


def test_cart_totals_and_update(uow, user):
    cart = AddToCart(uow, CLOCK, CONFIG)(user, 1, 2)
    assert cart.totals.total_items_cop == 200000 and cart.totals.shipping_cop == 12000 and cart.item_count == 2
    item_id = cart.items[0].id
    with pytest.raises(OutOfStock):
        UpdateCartItem(uow, CLOCK, CONFIG)(user, item_id, 6)
    assert UpdateCartItem(uow, CLOCK, CONFIG)(user, item_id, 5).totals.total_cop == 500000
    with pytest.raises(NotFound):
        UpdateCartItem(uow, CLOCK, CONFIG)(user, 12345, 1)


def test_merge_clamps_and_quote_does_not_persist(uow, store, user):
    cart = MergeCart(uow, CLOCK, CONFIG)(user, [(1, 9), (1, 1), (2, 5), (77, 1)])
    assert {i.variant_id: i.quantity for i in cart.items} == {1: 5, 2: 1}
    quote = QuoteCart(uow, CLOCK, CONFIG)([(1, 2), (77, 1)])
    assert [i.quantity for i in quote.items] == [2] and quote.totals.total_items_cop == 200000
    assert store.carts[user.id] and len(store.carts[user.id]) == 2


# ---------- checkout + payment ----------
def place(uow, user, gateway, items):
    for vid, qty in items:
        AddToCart(uow, CLOCK, CONFIG)(user, vid, qty)
    return Checkout(uow, gateway, CLOCK, CONFIG)(user, SHIP)


def test_checkout_requires_items_and_valid_shipping(uow, user):
    gw = FakeGateway()
    with pytest.raises(CartEmpty):
        Checkout(uow, gw, CLOCK, CONFIG)(user, SHIP)
    AddToCart(uow, CLOCK, CONFIG)(user, 1, 1)
    bad = ShippingInfo("Ana Pérez", "3101234567", "Calle 1 # 2-3", "Pasto", "Nariño", "52")
    with pytest.raises(ValidationError):
        Checkout(uow, gw, CLOCK, CONFIG)(user, bad)


def test_checkout_snapshots_order_and_empties_cart(uow, store, user):
    order, intent = place(uow, user, FakeGateway(), [(1, 2), (2, 1)])
    assert order.status == "pending" and order.number.startswith("CG-")
    assert [i.line_total_cop for i in order.items] == [200000, 200000] and order.totals.total_cop == 400000
    assert order.history[0].to_status == "pending" and intent.reference.startswith("REF-")
    assert store.carts[user.id] == {} and store.variants[1].stock == 5  # stock is untouched until payment


def test_approved_payment_decrements_stock_and_logs(uow, store, user):
    gw = FakeGateway()
    order, intent = place(uow, user, gw, [(1, 2)])
    payment, paid = SimulatePayment(uow, gw, CLOCK)(user, intent.reference, "approved")
    assert payment.status == "approved" and paid.status == "paid"
    assert store.variants[1].stock == 3
    assert store.movements == [dict(variant_id=1, delta=-2, reason="purchase", note=f"Pedido {order.number}",
                                    user_id=user.id, order_id=order.id, now=CLOCK.now())]
    assert [h.to_status for h in paid.history] == ["pending", "paid"]


def test_insufficient_stock_at_payment_cancels_order(uow, store, user):
    gw = FakeGateway()
    _, intent = place(uow, user, gw, [(2, 1)])
    store.variants[2].stock = 0  # somebody else bought the last unit meanwhile
    payment, order = SimulatePayment(uow, gw, CLOCK)(user, intent.reference, "approved")
    assert payment.status == "failed" and order.status == "cancelled"
    assert order.history[-1].note == "Sin stock al confirmar el pago"
    assert store.variants[2].stock == 0 and store.movements == []


def test_partial_shortage_decrements_nothing(uow, store, user):
    gw = FakeGateway()
    _, intent = place(uow, user, gw, [(1, 2), (2, 1)])
    store.variants[2].stock = 0
    SimulatePayment(uow, gw, CLOCK)(user, intent.reference, "approved")
    assert store.variants[1].stock == 5  # all-or-nothing


def test_declined_keeps_order_pending_and_can_retry(uow, store, user):
    gw = FakeGateway()
    order, intent = place(uow, user, gw, [(1, 1)])
    payment, still = SimulatePayment(uow, gw, CLOCK)(user, intent.reference, "declined")
    assert payment.status == "declined" and still.status == "pending" and store.variants[1].stock == 5
    with pytest.raises(PaymentError):
        SimulatePayment(uow, gw, CLOCK)(user, intent.reference, "approved")
    again = RetryPayment(uow, gw, CLOCK, CONFIG)(user, order.id)
    assert again.reference != intent.reference
    _, paid = SimulatePayment(uow, gw, CLOCK)(user, again.reference, "approved")
    assert paid.status == "paid" and store.variants[1].stock == 4


def test_retry_blocked_when_stock_gone_or_not_owner(uow, store, user):
    gw = FakeGateway()
    order, _ = place(uow, user, gw, [(2, 1)])
    store.variants[2].stock = 0
    with pytest.raises(OutOfStock):
        RetryPayment(uow, gw, CLOCK, CONFIG)(user, order.id)
    stranger = FakeUoW(store).users.add(User(None, "x@y.co", "h", "Otro"))
    with pytest.raises(NotFound):
        RetryPayment(uow, gw, CLOCK, CONFIG)(stranger, order.id)
    with pytest.raises(NotFound):
        SimulatePayment(uow, gw, CLOCK)(stranger, "REF-1", "approved")


# ---------- admin ----------
def test_adjust_stock_never_goes_negative(uow, store, admin):
    adjust = AdjustStock(uow, CLOCK)
    assert adjust(admin, 2, 4, "restock", "lote")["stock"] == 5
    with pytest.raises(OutOfStock):
        adjust(admin, 2, -6, "adjustment", None)
    assert store.variants[2].stock == 5 and len(store.movements) == 1
    assert adjust(admin, 2, -5, "adjustment", None)["stock"] == 0
    for bad in ((0, "adjustment"), (-1, "restock"), (1, "x")):
        with pytest.raises(ValidationError):
            adjust(admin, 2, bad[0], bad[1], None)
    with pytest.raises(NotFound):
        adjust(admin, 99, 1, "restock", None)


def test_transition_order_cancel_returns_stock(uow, store, user, admin):
    gw = FakeGateway()
    order, intent = place(uow, user, gw, [(1, 3)])
    SimulatePayment(uow, gw, CLOCK)(user, intent.reference, "approved")
    transition = TransitionOrder(uow, CLOCK)
    with pytest.raises(InvalidTransition):
        transition(admin, order.id, "delivered")
    assert transition(admin, order.id, "preparing", "ok").status == "preparing"
    cancelled = transition(admin, order.id, "cancelled")
    assert cancelled.status == "cancelled" and store.variants[1].stock == 5
    assert store.movements[-1]["reason"] == "cancellation" and store.movements[-1]["delta"] == 3
    with pytest.raises(InvalidTransition):
        transition(admin, order.id, "cancelled")
    assert store.variants[1].stock == 5  # not returned twice


def test_cancel_pending_does_not_touch_stock(uow, store, user, admin):
    order, _ = place(uow, user, FakeGateway(), [(1, 3)])
    TransitionOrder(uow, CLOCK)(admin, order.id, "cancelled", "sin pago")
    assert store.variants[1].stock == 5 and store.movements == []
    with pytest.raises(InvalidTransition):
        TransitionOrder(uow, CLOCK)(admin, order.id, "paid")
