
console.log("aaaaaaaaaaaaaaaaaaaaaaa")
export async function loader({ request }) {
console.log("loaderloaderloaderloaderloader")
  
  const url    = new URL(request.url);
  const type   = url.searchParams.get("type")  || "code128";
  const value  = url.searchParams.get("value") || "";
  const width  = url.searchParams.get("width") || "200";
  const height = url.searchParams.get("height")|| "60";

  if (!value) {
    return new Response("missing value", { status: 400 });
  }

  // Map our internal type keys → TEC-IT code= param
  const CODE_MAP = {
    code128:      "Code128",
    code11:       "Code11",
    itf:          "I2of5",
    code39:       "Code39",
    code39ext:    "Code39Ext",
    code93:       "Code93",
    flattermarken:"Flattermarken",
    gs1128:       "GS1-128",
    msi:          "MSI",
    pharmacode1:  "Pharmacode",
    pharmacode2:  "Pharmacode2",
    telepen:      "TelepenAlpha",
    qrcode:       "QRCode",
  };

  const code = CODE_MAP[type] ?? "Code128";

  // For GS1-128 wrap in AI (21)
  const encodedValue = type === "gs1128" ? `(21)${value}` : value;

  const params = new URLSearchParams({
    data:  encodedValue,
    code,
    dpi:   "200",
    bcolor:"%23ffffff",
    ...(type === "gs1128" || type === "code39ext"
      ? { "translate-esc": "on" }
      : {}),
  });

  const tecItUrl = `https://barcode.tec-it.com/barcode.ashx?${params}`;

  try {
    const res = await fetch(tecItUrl);
    if (!res.ok) throw new Error(`TEC-IT returned ${res.status}`);

    const buffer      = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/png";

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":  contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[barcode proxy]", err);
    return new Response("barcode fetch failed", { status: 502 });
  }
}