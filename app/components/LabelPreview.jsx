import React from "react";

const LabelPreview = ({ lines, shop }) => {
  return (
    <div
      className="label-preview"
      style={{
        width: "288px",
        height: "270px",
        background: "white",
        borderRadius: "4px",
        padding: "20px",
        position: "relative",
        border: "1px solid #e0e0e0",
        fontSize: "90%",
        boxSizing: "border-box",
        margin: 0,
      }}
    >
      {/* Corner Decorations */}
      {/* <div
        style={{
          position: "absolute",
          width: "20px",
          height: "20px",
          border: "2px solid #ddd",
          top: "10px",
          left: "10px",
          borderRight: "none",
          borderBottom: "none",
          boxSizing: "border-box",
        }}
      ></div>

      <div
        style={{
          position: "absolute",
          width: "20px",
          height: "20px",
          border: "2px solid #ddd",
          top: "10px",
          right: "10px",
          borderLeft: "none",
          borderBottom: "none",
          boxSizing: "border-box",
        }}
      ></div>

      <div
        style={{
          position: "absolute",
          width: "20px",
          height: "20px",
          border: "2px solid #ddd",
          bottom: "10px",
          left: "10px",
          borderRight: "none",
          borderTop: "none",
          boxSizing: "border-box",
        }}
      ></div>

      <div
        style={{
          position: "absolute",
          width: "20px",
          height: "20px",
          border: "2px solid #ddd",
          bottom: "10px",
          right: "10px",
          borderLeft: "none",
          borderTop: "none",
          boxSizing: "border-box",
        }}
      ></div> */}


      {lines?.map((line, index) => {
        // console.log("line=====>", line);

        return (
          <React.Fragment key={index}>
            {/* Store Section */}
            {line.id == "line-1" && line.fields?.length && (
              <div
                style={{
                  textAlign: "center",
                  marginBottom: "5px",
                  paddingBottom: "5px",
                  borderBottom: "2px solid #f0f0f0",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 800,
                    letterSpacing: "1px",
                    color: "#1a1a1a",
                  }}
                >
                  {shop?.split(".")[0]}
                </div>
              </div>
            )}
            {/* Product Title */}
            {line.id == "line-2" && line.fields?.length && (
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#000",
                  lineHeight: 1,
                  margin: "5px 0",
                  paddingBlock: "5px",
                  textTransform: "uppercase",
                }}
              >
                {line.fields.map((elm, index) => (
                  <span key={elm.id}>
                    {index == 1 && " - "} {elm.default}
                  </span>
                ))}
              </div>
            )}
            {/* Price Section */}
            {line.id == "line-3" && line.fields?.length && (
              <div
                style={{
                  background: "#f8f8f8",
                  padding: "5px",
                  borderRadius: "6px",
                  borderLeft: "4px solid #2e7d32",
                  display: "flex",
                  justifyContent: "space-between",
                  alignContent: "center",
                }}
              >
                {line.fields.map((field, index) => {
                  if (field.id === "price") {
                    return (
                      <div
                        key={index}
                        style={{
                          fontSize: "16px",
                          fontWeight: 700,
                          color: "#2e7d32",
                          lineHeight: 1,
                        }}
                      >
                        MRP {field?.default}
                      </div>
                    );
                  }

                  if (field.id === "compareAtPrice") {
                    return (
                      <div
                        key={index}
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#888",
                          textDecoration: "line-through",
                        }}
                      >
                        {field?.default}
                      </div>
                    );
                  }

                  if (field.id === "inventoryQuantity") {
                    return (
                      <div key={index}>
                        <span style={{ color: "#666" }}>QTY:</span>{" "}
                        {field?.default}
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
            {/* Barcode Section */}
            {line.id == "barcodeLines" && line.fields?.length && (
              <div
                style={{
                  background: "white",
                  padding: "5px 0",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                }}
              >
                {line.fields.map((field, index) => {
                  if (field.id == "barcodeLines") {
                    return (
                      <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "2px",
                        height: "80px",
                        alignItems: "flex-end",
                      }}
                    >
                      <img
                        src={`https://barcode.tec-it.com/barcode.ashx?data=44213201043621&code=code128&dpi=96&imagetype=png`}
                        style={{
                          height: "100%",
                          width: "auto",
                          objectFit: "contain",
                        }}
                        alt="barcode"
                      />
                    </div>
                    );
                  }
                  {
                    /* QR Code Section */
                  }
                  if (field.id == "barcode") {
                    return (
                      <div
                        style={{
                          fontFamily: "'Courier New', monospace",
                          fontSize: "12px",
                          fontWeight: 600,
                          letterSpacing: "2px",
                          color: "#000",
                        }}
                      >
                        {field.default}
                      </div>
                    );
                  }

                  if (field.id == "qrcode") {
                    return (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "2px",
                          height: "40px",
                          padding: "3px",
                          alignItems: "flex-end",
                        }}
                      >
                        <div
                          style={{
                            width: "60px",
                            height: "40px",
                            display: "grid",
                            gridTemplateColumns: "repeat(7, 1fr)",
                            gap: "2px",
                            padding: "3px",
                            border: "1px solid #ddd",
                          }}
                        >
                          {Array.from({ length: 49 }).map((_, i) => (
                            <div
                              key={i}
                              style={{
                                backgroundColor:
                                  Math.random() > 0.5 ? "#000" : "#fff",
                                aspectRatio: "1",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }
                  {
                    /* Link at bottom */
                  }
                  if (field.id == "productUrl") {
                    return (
                      <div
                        style={{
                          fontWeight: "bold",
                          fontSize: "11px",
                          color: "#666",
                          textAlign: "center",
                          wordBreak: "break-all",
                        }}
                      >
                        {field.default}
                      </div>
                    );
                  }
                  if (field.id == "sku") {
                    return (
                      <div
                        style={{
                          marginTop: "8px",
                          fontWeight: "bold",
                          fontSize: "11px",
                          color: "#666",
                          lineHeight: 1.4,
                          textAlign: "center",
                          wordBreak: "break-all",
                        }}
                      >
                        {field.default}
                      </div>
                    );
                  }
                })}
              </div>
            )}
            {/* Meta data */}
            {line.id == "metadata" && line.fields?.length && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "10px",
                  color: "#444",
                  wordBreak: "break-all",
                  background: "#f5f5f5",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  margin: "8px 0px",
                }}
              >
                <div>
                  <span style={{ color: "#666" }}>SKU:</span> NN8976SL10W
                </div>
                <div>
                  <span style={{ color: "#666" }}>Vendor:</span> Shopify
                </div>
              </div>
            )}
            {/* Footer Metadata */}
            {line.id == "footer" && line.fields?.length && (
              <div
                style={{
                  position: "absolute",
                  bottom: "20px",
                  left: "20px",
                  right: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "7px",
                  color: "#999",
                  borderTop: "1px solid #eee",
                }}
              >
                {line.fields.map((field, index) => {
                  return <span key={index}>{field.default}</span>;
                })}
                {/* <span>2026-02-13</span> */}
                {/* <span>W 1801AJWH302983JX.T</span> */}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default LabelPreview;
