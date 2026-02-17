from django.db import models

class Invoice(models.Model):
    invoice_number = models.CharField(max_length=100, unique=True)
    customer_name = models.CharField(max_length=255)
    date_issued = models.DateField()
    due_date = models.DateField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50, choices=[
        ('paid', 'Paid'),
        ('unpaid', 'Unpaid'),
        ('overdue', 'Overdue'),
    ])

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.customer_name}"