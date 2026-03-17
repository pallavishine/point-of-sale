import { useState, useEffect } from "react";
import LabelPDF from "../components/LabelPDF";
export default function PDFPrintButton({
  documentProps = {},
  buttonText = "Print",
  setSelectedVariantIds,
  setSelectedVariants,
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const generateAndOpenPDF = async () => {
    if (!LabelPDF) {
      shopify.toast.show("No document to generate", { isError: true });
      return;
    }

    setIsGenerating(true);

    try {
      const { pdf } = await import("@react-pdf/renderer");

      // 🔑 Pass props here
      const blob = await pdf(<LabelPDF {...documentProps} />).toBlob();
      console.log("blob", blob);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (err) {
      console.error(err);
      shopify.toast.show("Failed to generate PDF", { isError: true });
    } finally {
      setIsGenerating(false);
      setSelectedVariantIds && setSelectedVariantIds(new Set());
      setSelectedVariants && setSelectedVariants([]);
    }
  };

  if (!isClient) {
    return (
      <s-button variant="primary" disabled>
        Loading...
      </s-button>
    );
  }

  return (
    <s-button
      variant="primary"
      onClick={() => {
        if (!documentProps.testPrint && !documentProps.selectedTemplate) {
          shopify.toast.show(
            "Please select a label template before printing.!",
            { isError: true },
          );
        } else {
          generateAndOpenPDF();
        }
      }}
      disabled={isGenerating}
      icon="print"
      loading={isGenerating}
    >
      {buttonText}
    </s-button>
  );
}
