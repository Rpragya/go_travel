from django.core import mail

from apps.accounts.models import EmailOTP, User


def test_register_sends_otp_and_verify(anon, db):
    resp = anon.post(
        "/api/auth/register/",
        {"email": "New@Example.com", "password": "Sup3r!secret", "first_name": "New"},
        format="json",
    )
    assert resp.status_code == 201
    assert resp.data["user"]["email"] == "new@example.com"
    assert len(mail.outbox) == 1

    user = User.objects.get(email="new@example.com")
    anon.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    assert anon.post("/api/auth/verify-email/", {"code": "000000"}, format="json").status_code == 400
    code = EmailOTP.objects.filter(user=user).last().code
    resp = anon.post("/api/auth/verify-email/", {"code": code}, format="json")
    assert resp.status_code == 200 and resp.data["is_verified"] is True


def test_login_is_case_insensitive(anon, user):
    resp = anon.post("/api/auth/login/", {"email": "ASHA@example.com", "password": "Str0ng!pass"}, format="json")
    assert resp.status_code == 200
    assert "access" in resp.data and resp.data["user"]["first_name"] == "Asha"


def test_travellers_are_private(client, user):
    client.post("/api/auth/travellers/", {"first_name": "A", "last_name": "B", "gender": "M"}, format="json")
    assert len(client.get("/api/auth/travellers/").data) == 1
    other = User.objects.create_user("x@y.com", "Str0ng!pass")
    client.force_authenticate(other)
    assert client.get("/api/auth/travellers/").data == []
