from urllib.parse import urljoin

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


def send_activation_email(request, user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    path = settings.ACTIVATION_URL.format(uid=uid, token=token)
    activation_link = urljoin(settings.FRONTEND_URL.rstrip('/') + '/', path)
    html_message = render_to_string(
        'emails/activation.html',
        {
            'user': user,
            'activation_link': activation_link,
            'url': path,
        },
    )
    send_mail(
        'Activate your inventory account',
        f'Activate your account: {activation_link}',
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        html_message=html_message,
        fail_silently=False,
    )
