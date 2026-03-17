import { useEffect, useState } from "react";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { templateModel } from "../db.schema";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const data = await templateModel.find({ shop: session.shop });
  const templates = await JSON.parse(JSON.stringify(data));

  return { templates: templates };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");
  const templateId = formData.get("templateId");

  try {
    if (action === "toggleStatus") {
      const template = await templateModel.findById(templateId);

      if (!template) {
        return {
          status: false,
          message: "Template not found",
        };
      }

      const oldStatus = template.status;
      template.status = template.status === "active" ? "draft" : "active";
      await template.save();

      return {
        status: true,
        message:
          oldStatus === "active"
            ? "Template is Drafted"
            : "Template is activated",
        data: {
          id: template._id.toString(),
          newStatus: template.status,
        },
      };
    } else if (action === "delete") {
      const deleteResult = await templateModel.deleteOne({
        shop: session.shop,
        _id: templateId,
      });

      if (deleteResult.deletedCount === 0) {
        return {
          status: false,
          message: "Template not found",
        };
      }

      return {
        status: true,
        message: "Template deleted successfully",
        data: { id: templateId },
      };
    } else if (action === "duplicate") {
      const template = await templateModel.findById(templateId);

      if (!template) {
        return {
          status: false,
          message: "Template not found",
        };
      }

      const templateData = template.toObject();
      delete templateData._id;
      delete templateData.createdAt;
      delete templateData.updatedAt;
      delete templateData.__v;

      const duplicate = new templateModel({
        ...templateData,
        templateName: `${templateData.templateName} (Copy)`,
        status: "draft",
        shop: session.shop,
      });

      await duplicate.save();

      return {
        status: true,
        message: "Template duplicated successfully",
        data: {
          id: duplicate._id.toString(),
          name: duplicate.templateName,
        },
      };
    }

    return {
      status: false,
      message: "Invalid action",
    };
  } catch (error) {
    console.error("Action error:", error);
    return {
      status: false,
      message: "An error occurred while processing your request",
    };
  }
};

export default function Index() {
  const navigate = useNavigate();
  const { templates } = useLoaderData();
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const [isLoading, setLoading] = useState(false);
  const [deleteTemplate, setDeleteTemplate] = useState(null);
  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      const { status, message } = fetcher.data;

      if (status === true) {
        shopify.toast.show(message, { duration: 3000 });
      } else if (status === false) {
        shopify.toast.show(message, {
          duration: 5000,
          isError: true,
        });
      }
    }
  }, [fetcher.data, fetcher.state]);

  const handleStatusToggle = (templateId, currentStatus) => {
    const formData = new FormData();
    formData.append("action", "toggleStatus");
    formData.append("templateId", templateId);
    fetcher.submit(formData, { method: "post" });
  };

  const handleDelete = (templateId) => {
    if (templateId) {
      const formData = new FormData();
      formData.append("action", "delete");
      formData.append("templateId", templateId);
      fetcher.submit(formData, { method: "post" });
    }
  };

  const handleDuplicate = (templateId) => {
    const formData = new FormData();
    formData.append("action", "duplicate");
    formData.append("templateId", templateId);
    fetcher.submit(formData, { method: "post" });
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    if (status === "active") {
      return (
        <s-badge color="success" tone="success" icon="">
          Active
        </s-badge>
      );
    }
    return (
      <s-badge color="warning" tone="warning" icon="">
        Draft
      </s-badge>
    );
  };

  return (
    <s-page heading="Templates">
      <s-link slot="breadcrumb-actions" href="/app">
        pos-app-new
      </s-link>

      <s-stack direction="inline" justifyContent="end" paddingBlockEnd="small">
        <s-stack direction="inline" gap="small" alignItems="end">
          <s-button icon="export" variant="secondary" prefix={<s-icon type="export" />}>
            Export
          </s-button>
          <s-button icon="import" variant="secondary" prefix={<s-icon type="import" />}>
            Import
          </s-button>
          <s-button
            variant="primary"
            prefix={<s-icon type="plus" />}
            onClick={() => {
              navigate("/app/template/create");
            }}
          >
            Create template
          </s-button>
        </s-stack>
      </s-stack>

      <s-stack paddingBlock="small">
        {!templates?.length && (
          <s-section accessibilityLabel="Empty state section">
            <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
              <s-box maxInlineSize="200px" maxBlockSize="200px">
                <s-image
                  aspectRatio="1/0.5"
                  src="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
                  alt="A stylized graphic of four characters, each holding a template piece"
                />
              </s-box>
              <s-grid justifyItems="center" maxInlineSize="450px" gap="base">
                <s-stack alignItems="center">
                  <s-heading>Start creating templates</s-heading>
                  <s-paragraph>
                    Create your first template to get started with personalized
                    designs.
                  </s-paragraph>
                </s-stack>
                <s-button-group>
                  <s-button
                    variant="plain"
                    onClick={() => {
                      window.open("/docs/templates", "_blank");
                    }}
                  >
                    Learn more
                  </s-button>
                  <s-button
                    variant="primary"
                    prefix={<s-icon type="plus" />}
                    onClick={() => {
                      navigate("/app/template/create");
                    }}
                  >
                    Create template
                  </s-button>
                </s-button-group>
              </s-grid>
            </s-grid>
          </s-section>
        )}

        {templates?.length > 0 && (
          <s-section
            padding="none"
            accessibilityLabel="Templates table section"
          >
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header listSlot="primary">Template</s-table-header>
                <s-table-header>Created</s-table-header>
                <s-table-header>Status</s-table-header>
                <s-table-header alignment="end">Actions</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {[...templates]?.reverse()?.map((template, index) => (
                  <s-table-row key={index}>
                    <s-table-cell>
                      <s-stack
                        direction="inline"
                        gap="small"
                        alignItems="center"
                      >
                        <s-thumbnail
                          size="small"
                          alt={template?.templateName}
                          source={
                            template?.thumbnail ||
                            "https://cdn.shopify.com/static/images/polaris/placeholder.svg"
                          }
                        />
                        <s-link href={`/app/template/${template?._id}`}>
                          {template?.templateName || "Untitled Template"}
                        </s-link>
                      </s-stack>
                    </s-table-cell>
                    <s-table-cell>
                      {formatDate(template?.createdAt || template?.updatedAt)}
                    </s-table-cell>
                    <s-table-cell>
                      {getStatusBadge(template?.status || "draft")}
                    </s-table-cell>
                    <s-table-cell alignment="end">
                      <s-stack direction="inline">
                        <s-tooltip id="edit-button-tooltip">
                          <s-text>Edit template</s-text>
                        </s-tooltip>
                        <s-button
                          interestFor="edit-button-tooltip"
                          variant="tertiary"
                          size="small"
                          href={`/app/template/${template?._id}`}
                          onClick={() =>
                            navigate(`/app/template/${template?._id}`)
                          }
                          icon="edit"
                        ></s-button>
                        <s-tooltip id="duplicate-button-tooltip">
                          <s-text>Duplicate template</s-text>
                        </s-tooltip>
                        <s-button
                          interestFor="duplicate-button-tooltip"
                          variant="tertiary"
                          size="small"
                          onClick={() => {
                            handleDuplicate(template._id);
                          }}
                          icon="duplicate"
                        ></s-button>

                        <s-tooltip id="status-button-tooltip">
                          <s-text>
                            {template?.status === "active"
                              ? "Set as draft"
                              : "Publish"}
                          </s-text>
                        </s-tooltip>
                        <s-button
                          interestFor="status-button-tooltip"
                          variant="tertiary"
                          size="small"
                          onClick={() => {
                            handleStatusToggle(template._id, template?.status);
                          }}
                          icon={
                            template?.status === "active"
                              ? "pause-circle"
                              : "status-active"
                          }
                        ></s-button>

                        <s-tooltip id="delete-button-tooltip">
                          <s-text>Delete template</s-text>
                        </s-tooltip>
                        <s-button
                          interestFor="delete-button-tooltip"
                          commandFor="delete-template-modal"
                          command="--show"
                          variant="tertiary"
                          size="small"
                          tone="critical"
                          onClick={() =>
                            setDeleteTemplate({
                              name: template.templateName,
                              id: template._id,
                            })
                          }
                          icon="delete"
                        ></s-button>
                      </s-stack>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
          </s-section>
        )}
      </s-stack>

      <s-modal id="delete-template-modal" heading="Delete template?">
        <s-stack gap="base">
          <s-text>
            Are you sure you want to delete "{deleteTemplate?.name}" template?
          </s-text>
          <s-text tone="caution">This action cannot be undone.</s-text>
        </s-stack>

        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          commandFor="delete-template-modal"
          command="--hide"
          onClick={() => handleDelete(deleteTemplate?.id)}
        >
          Delete
        </s-button>
        <s-button
          slot="secondary-actions"
          variant="secondary"
          commandFor="delete-template-modal"
          command="--hide"
          onClick={() => setDeleteTemplate(null)}
        >
          Cancel
        </s-button>
      </s-modal>

      {fetcher.state === "submitting" && (
        <s-spinner accessibilityLabel="Loading..." size="large" />
      )}
    </s-page>
  );
}
