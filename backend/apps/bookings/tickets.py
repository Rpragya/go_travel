"""E-ticket / hotel voucher PDF built with ReportLab."""

from io import BytesIO

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .models import Booking

BRAND = colors.HexColor("#008CFF")
ACCENT = colors.HexColor("#FF6D38")


def _fmt(dt):
    return timezone.localtime(dt).strftime("%a, %d %b %Y %H:%M")


def _table(rows, widths, header=True):
    table = Table(rows, colWidths=widths)
    style = [
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        style += [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EFF6FF")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ]
    table.setStyle(TableStyle(style))
    return table


def build_ticket_pdf(booking: Booking) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=14 * mm)
    styles = getSampleStyleSheet()
    h = ParagraphStyle("brand", parent=styles["Title"], textColor=BRAND, alignment=0, fontSize=22)
    sub = ParagraphStyle("sub", parent=styles["Normal"], textColor=colors.HexColor("#4B5563"))
    section = ParagraphStyle("section", parent=styles["Heading3"], textColor=colors.HexColor("#111827"))
    story = [
        Paragraph("go<font color='#FF6D38'>travels</font>", h),
        Paragraph("E-Ticket" if booking.booking_type == Booking.Type.FLIGHT else "Hotel Voucher", styles["Heading2"]),
        Paragraph(
            f"Booking ID: <b>{booking.reference}</b> &nbsp;|&nbsp; Status: <b>{booking.get_status_display()}</b>"
            f" &nbsp;|&nbsp; Booked on {_fmt(booking.created_at)}",
            sub,
        ),
        Spacer(1, 8 * mm),
    ]

    if booking.booking_type == Booking.Type.FLIGHT:
        rows = [["Flight", "From", "To", "Departure", "Arrival", "Class"]]
        for fare in (booking.flight_fare, booking.return_fare):
            if not fare:
                continue
            f = fare.flight
            rows.append(
                [
                    f"{f.airline.name}\n{f.airline.code}-{f.flight_number}",
                    f"{f.origin.city.name} ({f.origin.iata})",
                    f"{f.destination.city.name} ({f.destination.iata})",
                    _fmt(f.departure),
                    _fmt(f.arrival),
                    fare.get_cabin_class_display(),
                ]
            )
        story += [Paragraph("Itinerary", section), _table(rows, [32 * mm, 30 * mm, 30 * mm, 32 * mm, 32 * mm, 22 * mm])]
        story.append(Spacer(1, 3 * mm))
        fare = booking.flight_fare
        story.append(
            Paragraph(
                f"Baggage: {fare.baggage_checkin} check-in, {fare.baggage_cabin} cabin. "
                "Report at the airport at least 2 hours before departure (3 hours for international).",
                sub,
            )
        )
    else:
        hotel = booking.room_type.hotel
        rows = [
            ["Hotel", f"{hotel.name} ({hotel.star_rating}-star)"],
            ["Address", Paragraph(hotel.address, styles["Normal"])],
            ["Check-in", f"{booking.check_in:%a, %d %b %Y} from {hotel.check_in_time:%H:%M}"],
            ["Check-out", f"{booking.check_out:%a, %d %b %Y} by {hotel.check_out_time:%H:%M}"],
            ["Room", f"{booking.rooms} x {booking.room_type.name} ({booking.nights} night(s))"],
            ["Guests", str(booking.guests)],
            ["Meals", "Breakfast included" if booking.room_type.breakfast_included else "Room only"],
        ]
        story += [Paragraph("Stay details", section), _table(rows, [35 * mm, 143 * mm], header=False)]

    story += [Spacer(1, 6 * mm), Paragraph("Travellers" if booking.booking_type == "FLIGHT" else "Guests", section)]
    pax_rows = [["#", "Name", "Gender", "Age", "Type"]] + [
        [str(i), f"{p.first_name} {p.last_name}", p.get_gender_display(), str(p.age), p.get_pax_type_display()]
        for i, p in enumerate(booking.passengers.all(), 1)
    ]
    story.append(_table(pax_rows, [10 * mm, 80 * mm, 30 * mm, 20 * mm, 38 * mm]))

    story += [Spacer(1, 6 * mm), Paragraph("Payment summary", section)]
    pay_rows = [
        ["Base amount", f"Rs. {booking.base_amount:,.2f}"],
        ["Taxes & fees", f"Rs. {booking.taxes:,.2f}"],
    ]
    if booking.discount:
        code = booking.coupon.code if booking.coupon else "coupon"
        pay_rows.append([f"Discount ({code})", f"- Rs. {booking.discount:,.2f}"])
    pay_rows.append(["Total paid", f"Rs. {booking.total_amount:,.2f}"])
    if booking.refund_amount:
        pay_rows.append(["Refund", f"Rs. {booking.refund_amount:,.2f}"])
    t = _table(pay_rows, [140 * mm, 38 * mm], header=False)
    t.setStyle(TableStyle([("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"), ("ALIGN", (1, 0), (1, -1), "RIGHT")]))
    story.append(t)

    story += [
        Spacer(1, 8 * mm),
        Paragraph(f"Contact: {booking.contact_email} | {booking.contact_phone}", sub),
        Paragraph("This is a demo booking generated by Go Travels, a personal portfolio project.", sub),
    ]
    doc.build(story)
    return buf.getvalue()
