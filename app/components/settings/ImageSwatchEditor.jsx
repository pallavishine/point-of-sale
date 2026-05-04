import { useState } from "react";

export default function ImageSwatchEditor({ field, setField }) {
  const [activeOptionId, setActiveOptionId] = useState(null);
  const [tempImageUrl, setTempImageUrl] = useState("");

  const updateOption = (id, key, value) =>
    setField((f) => ({
      ...f,
      options: f.options.map((o) => (o.id === id ? { ...o, [key]: value } : o)),
    }));

  const addOption = () => {
    setField((f) => ({
      ...f,
      options: [
        ...f.options,
        {
          id: crypto.randomUUID(),
          name: `image_${f.options.length + 1}`,
          imageUrl: "",
          addonPrice: 0,
        },
      ],
    }));
  };



  const saveImage = () => {
    if (activeOptionId && tempImageUrl) {
      updateOption(activeOptionId, "imageUrl", tempImageUrl);
      setTempImageUrl("");
      setActiveOptionId(null);
    }
  };

  return (
    <s-box border="base" padding="base" borderRadius="base">
      <s-stack gap="small-200">
        <s-heading>Image Swatch Options</s-heading>
        <s-text tone="subdued" size="small">
          Define image options with thumbnails
        </s-text>

        {field.options.map((opt, idx) => (
          <s-box key={opt.id} border="base" padding="small-100">
            <s-grid
              gridTemplateColumns="repeat(12, 1fr)"
              gap="base"
              alignItems="center"
            >
              <s-grid-item gridColumn="span 3">
                <s-text-field
                  label="Option Name"
                  value={opt.name}
                  onInput={(e) => updateOption(opt.id, "name", e.target.value)}
                />
              </s-grid-item>
              <s-grid-item gridColumn="span 3">
                <s-stack gap="small">
                  <s-text size="small">Image</s-text>
                  <s-clickable
                    onClick={() => {
                      setActiveOptionId(opt.id);
                      setTempImageUrl(opt.imageUrl);
                    }}
                    commandFor="image-upload-modal"
                    command="--show"
                  >
                    <s-thumbnail
                      src={opt.imageUrl ?? ""}
                      alt="Product thumbnail"
                      size="small-200"
                    />
                  </s-clickable>
                </s-stack>
              </s-grid-item>
              <s-grid-item gridColumn="span 5">
                <s-number-field
                  label="Add On Price"
                  value={opt.addonPrice ?? 0}
                  onChange={(e) =>
                    updateOption(opt.id, "addonPrice", Number(e.target.value))
                  }
                />
              </s-grid-item>
              <s-grid-item gridColumn="span 1">
                {field.options.length > 1 && (
                  <s-button
                    tone="critical"
                    variant="tertiary"
                    icon="delete"
                    accessibilityLabel="icon"
                    onClick={() =>
                      setField((f) => ({
                        ...f,
                        options: f.options.filter((o) => o.id !== opt.id),
                      }))
                    }
                  />
                )}
              </s-grid-item>
            </s-grid>
          </s-box>
        ))}

        <s-button variant="secondary" onClick={addOption}>
          + Add Image Option
        </s-button>

        <s-modal
          id="image-upload-modal"
          heading="Upload Image"
          onHide={() => {
            setTempImageUrl("");
            setActiveOptionId(null);
          }}
          accessibilityLabel="Image upload dialog"
        >
          <s-stack gap="base">
            {!tempImageUrl ? (
              <s-drop-zone
                accept="image/*"
                onInput={(event) => {
                  const file = event.currentTarget?.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setTempImageUrl(reader.result);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                onChange={(event) => {
                  const file = event.currentTarget?.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setTempImageUrl(reader.result);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                onDropRejected={(event) => {
                  console.error("File rejected:", event.currentTarget?.value);
                  shopify.toast.show(
                    "Invalid file type. Please upload an image.",
                    { isError: true },
                  );
                }}
              ></s-drop-zone>
            ) : (
                <>
                <s-stack direction="inline" alignItems="center" justifyContent="center">
                  <s-box inlineSize="200">
                    <s-image
                      src={tempImageUrl}
                      alt="Preview"
                      borderRadius="large"
                      objectFit="contain"
                      aspectRatio="1/1"
                    />
                  </s-box>
                </s-stack>
                <s-stack direction="inline" justifyContent="center">
                  <s-button
                    variant="secondary"
                    onClick={() => setTempImageUrl("")}
                  >
                    Change Image
                  </s-button>
                </s-stack>
              </>
            )}

            <s-stack direction="inline" justifyContent="end" gap="small">
              <s-button
                variant="secondary"
                onClick={() => {
                  setTempImageUrl("");
                  setActiveOptionId(null);
                }}
                commandFor="image-upload-modal"
                command="--hide"
              >
                Cancel
              </s-button>
              <s-button
                variant="primary"
                disabled={!tempImageUrl}
                onClick={saveImage}
                commandFor="image-upload-modal"
                command="--hide"
              >
                Add Image
              </s-button>
            </s-stack>
          </s-stack>
        </s-modal>
      </s-stack>
    </s-box>
  );
}
