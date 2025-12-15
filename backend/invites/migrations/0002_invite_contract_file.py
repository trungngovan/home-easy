# Generated manually

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invites', '0001_initial'),
        ('files', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='invite',
            name='contract_file',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='invites', to='files.fileasset'),
        ),
    ]

