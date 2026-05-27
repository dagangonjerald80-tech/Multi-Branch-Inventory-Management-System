from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        profile = getattr(user, 'profile', None)
        verified = getattr(profile, 'is_email_verified', False) if profile else False
        return f'{user.pk}{timestamp}{user.email}{verified}'


email_verification_token = EmailVerificationTokenGenerator()
