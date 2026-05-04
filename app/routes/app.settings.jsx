import { settingsModel } from "../db.schema";
import { authenticate } from "../shopify.server";
import { useState, useEffect, useCallback } from "react";
import { useLoaderData, useFetcher, useRevalidator } from "react-router";
import { OptionSetsTable } from "../components/settings/OptionSetsTable";
import { OptionSetEditor } from "../components/settings/OptionSetEditor";
import { createOptionSet, validateOptionSet } from "../utils/optionSetHelpers";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const data = await settingsModel.findOne({ shop: session.shop });
  return { 
    optionSets: data?.optionSets?.map(set => ({
      ...set.toObject(),
      _id: set._id.toString()
    })) ?? [] 
  };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const actionType = formData.get("actionType");

  try {
    switch (actionType) {
      case "create": {
        const newOptionSet = JSON.parse(formData.get("data"));
        
        delete newOptionSet._id;
        
        await settingsModel.updateOne(
          { shop: session.shop },
          {
            $push: {
              optionSets: {
                ...newOptionSet,
                createdAt: new Date().toISOString(),
              },
            },
          },
          { upsert: true }
        );

        return { success: true };
      }

      case "edit": {
        const updatedOptionSet = JSON.parse(formData.get("data"));
        // console.log("updatedOptionSet",updatedOptionSet);
        
        await settingsModel.updateOne(
          {
            shop: session.shop,
            "optionSets._id": updatedOptionSet._id,
          },
          {
            $set: {
              "optionSets.$": updatedOptionSet,
            },
          }
        );

        return { success: true };
      }

      case "delete": {
        const id = formData.get("id");

        await settingsModel.updateOne(
          { shop: session.shop },
          {
            $pull: {
              optionSets: { _id: id },
            },
          }
        );

        return { success: true };
      }

      case "bulkDelete": {
        const ids = JSON.parse(formData.get("ids") || "[]");

        await settingsModel.updateOne(
          { shop: session.shop },
          {
            $pull: {
              optionSets: { _id: { $in: ids } },
            },
          }
        );

        return { success: true };
      }

      default:
        return { success: false, message: "Invalid action type" };
    }
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, message: "Something went wrong" };
  }
}

export default function SettingsPage() {
  const { optionSets: initial } = useLoaderData();
  console.log("optionSets",initial);
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const [optionSets, setOptionSets] = useState(initial);
  const [mode, setMode] = useState("list");
  const [id, setId] = useState(null);
  const [activeOptionSet, setActiveOptionSet] = useState(null);
  const [nameError, setNameError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refresh data after mutations
  const refreshData = useCallback(async () => {
    revalidator.revalidate();
  }, [revalidator]);

  // Update local state when loader data changes
  useEffect(() => {
    if (revalidator.state === "idle") {
      setOptionSets(initial);
    }
  }, [initial, revalidator.state]);

  useEffect(() => {
    if (activeOptionSet && mode === "editor") {
      setNameError(
        optionSets.some(
          (t) =>
            t._id !== activeOptionSet._id &&
            t.name?.trim().toLowerCase() === activeOptionSet.name?.trim().toLowerCase(),
        ),
      );
    }
  }, [activeOptionSet?.name, activeOptionSet?._id, optionSets, mode]);

  const handleActionCall = async (data, actionType) => {
    const fd = new FormData();
    fd.append("actionType", actionType);
    fd.append("data", JSON.stringify(data));
  
    return fetcher.submit(fd, { method: "post" });
  };

  const saveOptionSet = async () => {
    const error = validateOptionSet(activeOptionSet, optionSets);
    if (error) {
      if (window.shopify?.toast) {
        window.shopify.toast.show(error.message, { isError: true });
      } else {
        alert(error.message);
      }
      return;
    }
  
    const isEdit = optionSets.some((t) => t._id === activeOptionSet._id);
    console.log("isEdit",isEdit);
  
    setIsSaving(true);
    try {
      await handleActionCall(activeOptionSet, isEdit ? "edit" : "create");
      await refreshData();
      shopify.toast.show("Option set saved successfully");
      
      setMode("list");
      setActiveOptionSet(null);
    } catch (error) {
      console.error("Save error:", error);
      shopify.toast.show("Failed to save option set", { isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (o) => {
    console.log(o)
    setActiveOptionSet(o);
    setMode("editor");
    setId(o._id);
  };

  const handleDelete = async (id) => {
    const fd = new FormData();
    fd.append("actionType", "delete");
    fd.append("id", id);
  
    await fetcher.submit(fd, { method: "post" });
    
    // Refresh data after delete
    await refreshData();
  
    if (window.shopify?.toast) {
      window.shopify.toast.show("Option set deleted");
    }
  };
  
  const handleBulkDelete = async (ids) => {
    const fd = new FormData();
    fd.append("actionType", "bulkDelete");
    fd.append("ids", JSON.stringify(ids));
    
    await fetcher.submit(fd, { method: "post" });
    
    // Refresh data after bulk delete
    await refreshData();
    
    if (window.shopify?.toast) {
      window.shopify.toast.show("Selected option sets deleted");
    }
  };
  
  const handleCreateNew = () => {
    setActiveOptionSet(createOptionSet());
    setMode("editor");
  };

  // Wait for revalidation to complete
  if (revalidator.state === "loading" && optionSets.length === 0) {
    return <s-spinner />;
  }

  return (
    <s-page heading="Custom Fields">
      <s-link slot="breadcrumb-actions" href="/app">pos-app-new</s-link>

      {mode === "list" && (
        <s-stack gap="base">
          <s-stack direction="inline" justifyContent="space-between">
            <s-box />
            <s-button variant="primary" onClick={handleCreateNew}>+ Create Option Set</s-button>
          </s-stack>
          <OptionSetsTable
            optionSets={optionSets}
            onEdit={handleEdit}
            handleDelete={handleDelete}
            handleBulkDelete={handleBulkDelete}
            onCreateNew={handleCreateNew}
          />
        </s-stack>
      )}

      {mode === "editor" && activeOptionSet && (
        <OptionSetEditor
          optionSet={activeOptionSet}
          setOptionSet={setActiveOptionSet}
          onBack={() => {
            setMode("list");
            setId(null);
            setActiveOptionSet(null);
            setNameError(false);
          }}
          onSave={saveOptionSet}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
          nameError={nameError}
        />
      )}
    </s-page>
  );
}