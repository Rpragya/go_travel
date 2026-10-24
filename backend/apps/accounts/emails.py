from django.core.mail import send_mail

from .models import EmailOTP


def send_verification_otp(user):
    otp = EmailOTP.issue(user)
    send_mail(
        "Your Go Travels verification code",
        f"Hi {user.first_name or 'traveller'},\n\nYour verification code is {otp.code}. "
        "It is valid for 10 minutes.\n\n- Team Go Travels",
        None,
        [user.email],
    )
    return otp
