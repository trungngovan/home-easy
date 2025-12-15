# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('identity', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='bank_account_number',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='bank_code',
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
    ]
