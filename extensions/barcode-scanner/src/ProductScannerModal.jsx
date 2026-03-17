import { render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { VERIFY_PRODUCT_VARIANT } from "../../../app/Admin_Grapgql_Api/QUERIES";
import { decodeBarcode } from './utils/barcodeDecoder';
export default async () => {
  render(<FullScreenScanner />, document.body);
};

const FullScreenScanner = () => {
  const [scanStatus, setScanStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [cartStatus, setCartStatus] = useState(null);

  const scannedRef = useRef(false);
  const SERVER = "https://pst-clearing-sci-journal.trycloudflare.com";
  const { shopId, locationId, shopDomain } = shopify.session.currentSession;

  // Scanner setup
  useEffect(() => {
    if (hasScanned) return;
    const unsubscribe = shopify.scanner.scannerData.current.subscribe(
      (result) => {
        if (
          scannedRef.current ||
          !result?.data ||
          result.source !== "camera" ||
          isProcessing
        ) {
          return;
        }
        scannedRef.current = true;
        setHasScanned(true);
        setIsProcessing(true);
        fastHandleScan(result.data);
      },
    );

    // Show camera scanner - this opens full-screen camera
    shopify.scanner.showCameraScanner();

    return () => {
      unsubscribe();
      shopify.scanner.hideCameraScanner();
    };
  }, [hasScanned, isProcessing]);

  const fastHandleScan = async (barcode) => {

    setIsProcessing(true);
    console.log("Product Verifying ...");

    setScanStatus("Product Verifying ...");

    try {
      const variantId = decodeBarcode(barcode);
      console.log("variantId ",variantId);
      const product = await verifyProduct(variantId);
      console.log("product ",product);

      // Product not found (valid outcome)
      if (!product?.verified) {
        console.log("Product not found");
        setScanStatus("Product not found");
        shopify.toast.show("Product not found", { duration: 2500 });

        // setTimeout(resetScanner, 2000);
        return;
      }

      // Product found → add to cart
      // const variantId = product.productVariant.id?.split("/")?.pop();
      const productId = product.productVariant.product.id?.split("/")?.pop();
      if(product?.hasOptions){
        navigation.navigate(`shopify:point-of-sale/products/${productId}/variants/${variantId}`);

      }else {
        
      }
      // setScanStatus("Adding product to cart...");

      // const cartRes = await shopify.cart.addLineItem(Number(variantId), 1);
      // console.log("cartRes", cartRes);
      // setCartStatus(cartRes);
      // shopify.toast.show(`Product added to cart ${cartRes}`,{ duration: 1500 });
      // setScanStatus(`Product added ${cartRes}`);
      // navigation.navigate('shopify:point-of-sale/cart');
      
      // Optional navigation

      setTimeout(() => {
        shopify.extension.close();
      }, 1000);
    } catch (error) {
      console.error("Scan flow failed:", error);
      setScanStatus("Operation failed");
      shopify.toast.show(
        error?.message || "Something went wrong. Please try again.",
        { duration: 2000 },
      );

      // setTimeout(resetScanner, 1000);
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyProduct = async (barcode) => {
    try {
      if (!barcode) {
        throw new Error("Barcode is required");
      }

      const token = await shopify.session.getSessionToken();

      const requestBody = {
        query: VERIFY_PRODUCT_VARIANT,
        variables: {
          id: `gid://shopify/ProductVariant/${barcode}`,
        },
      };

      const res = await fetch("shopify:admin/api/graphql.json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error(`Shopify GraphQL HTTP error: ${res.status}`);
      }

      const data = await res.json();

      if (data.errors?.length) {
        console.error("GraphQL errors:", data.errors);
        throw new Error("Shopify GraphQL query failed");
      }

      const matchedVariant = data?.data?.productVariant;

      if (!matchedVariant) {
        return {
          status: 200,
          verified: false,
          barcode,
        };
      }

      return {
        status: 200,
        verified: true,
        productVariant: matchedVariant,
      };
    } catch (error) {
      console.error("verifyProduct failed:", error);

      throw new Error(
        error?.message || "Unexpected error while verifying product",
      );
    }
  };

  const resetScanner = () => {
    scannedRef.current = false;
    setHasScanned(false);
    setIsProcessing(false);
    setScanStatus("");
  };

  const closeScanner = () => {
    setIsProcessing(false);
    shopify.scanner.hideCameraScanner();
    shopify.extension.close();
  };

  return (
    <s-page heading="Scan Product">
      <s-button slot="secondary-actions" onClick={closeScanner}>
        Close
      </s-button>
      {isProcessing && (
        <s-box>
          <s-stack>
          <s-spinner accessibilityLabel="Loading content" />

            <s-text>{scanStatus}</s-text>
          </s-stack>
        </s-box>
      )}
    </s-page>
  );
};
