import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";


export default async () => {
  render(<Scanner />, document.body);
};

function Scanner() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState();
  const [sessionToken, setSessionToken] = useState();
  const [imageData, setImageData] = useState([]);
  const SERVER =
    "https://advisor-classification-vertical-mountain.trycloudflare.com";
  const { currency, shopId, locationId, userId, staffMemberId, shopDomain } = shopify.session.currentSession;

  useEffect(() => {
    handleAuthenticate();
  }, []);

  const handleCaptureAndUpload = async () => {
    setIsProcessing(true);
    try {
      const image = await shopify.camera.takePhoto({
        quality: 0.8,
        maxWidth: 1520,
        maxHeight: 1520,
      });

      // Upload the image to your backend server
      // (Replace with your actual backend endpoint)
      setImageData((prev) => [...prev, image]);
      const res = await fetch(`${SERVER}/api/upload?shop=${shopDomain}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // image: image.base64,
          // mimeType: image.type,
          shopify: shopify,
        }),
      });
      const responseData = await res.json();
      shopify.toast.show(responseData.message || "Photo uploaded!");
    } catch (error) {
      shopify.toast.show(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  const handleAuthenticate = async () => {
    setIsLoading(true);
    shopify.session.getSessionToken().then((token) => {
      setSessionToken(token);
      fetch(`${SERVER}/api/authentication?shop=${shopDomain}`, {
        method: "GET",
        mode: "cors",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          setAuthenticated(response.status === 200 ? true : false);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Authentication error:", error);
          setError(error.message);
          setIsLoading(false);
        });
    });
  };

  return (
    <s-page heading="Scan Product">
    {isLoading ? (
      <s-stack gap="base" alignItems="center" padding="small-100">
        <s-spinner accessibilityLabel="Loading content" />
        <s-spinner accessibilityLabel="Loading content" />
        <s-spinner accessibilityLabel="Loading content" />
      </s-stack>
    ) : (
      <s-scroll-box>
        <s-box padding="base">
          <s-stack gap="base">
            <s-text>
              Authenticated: {authenticated ? "Yes" : "No"}
            </s-text>
            {error && <s-text tone="critical">Error: {error}</s-text>}
          </s-stack>
        </s-box>
  
        {/* IMAGE GRID */}
        {imageData?.length > 0 && (
          <s-box padding="base">
            <s-stack direction="inline" gap="base" wrap>
              {imageData.map((img, index) => (
                <s-box
                  key={index}
                  padding="small"
                  style="
                    width: 140px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                  "
                >
                  {/* Square Image Box */}
                  <s-box
                    style="
                      width: 120px;
                      height: 120px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      overflow: hidden;
                      border-radius: 6px;
                      background: #f6f6f7;
                    "
                  >
                    <s-image
                      src={`data:${img.type};base64,${img.base64}`}
                      style="
                        max-width: 100%;
                        max-height: 100%;
                        object-fit: cover;
                      "
                    />
                  </s-box>
  
                  {/* Metadata */}
                  <s-stack gap="extra-tight" padding="extra-tight">
                    <s-text size="small">
                      {img.width} × {img.height}
                    </s-text>
                    <s-text size="small">
                      {(img.fileSize / 1024).toFixed(1)} KB
                    </s-text>
                    <s-text size="small">{img.type}</s-text>
                  </s-stack>
                </s-box>
              ))}
            </s-stack>
          </s-box>
        )}
  
        {/* ACTION */}
        {authenticated && (
          <s-box padding="base">
            <s-button
              onClick={handleCaptureAndUpload}
              disabled={isProcessing}
              fullWidth
            >
              {isProcessing ? "Capturing…" : "Take Photo"}
            </s-button>
          </s-box>
        )}
      </s-scroll-box>
    )}
  </s-page>
  
  );
}
