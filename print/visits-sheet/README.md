# Visits one-sheet (print)

Source of A2-School-Library-Visits.pdf (2 pages, US Letter). Render:

    google-chrome --headless=new --no-sandbox --allow-file-access-from-files --no-pdf-header-footer --print-to-pdf=A2-School-Library-Visits.pdf file://$PWD/print/visits-sheet/index.html

Text follows locales/en.js `visits`. Replace the [– pending] items when fees, travel distance and police check status are known. The QR code opens /educators/visits?ref=visits-sheet.
