import React, { useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { LineItem } from "./LineItem";

 const DragDropManager = ({
  lines,
  activeSettingId,
  onSettingsClick,
  updateLineSettings,
  onToggleField,
  onRemoveField,
  onReorderFields, // Your reorderFieldsInLine function
}) => {
  
  const handleDragEnd = useCallback((result) => {
    const { source, destination, type } = result;
    
    if (!destination) return;
    
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    
    // Handle field reordering (within same line)
    if (type === "FIELD") {
      onReorderFields(source.droppableId, source.index, destination.index);
    }
  }, [onReorderFields]);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="all-lines" type="LINE">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {lines.map((line, index) => (
              <Draggable
                key={line.id}
                draggableId={`line-${line.id}`}
                index={index}
                isDragDisabled={true} // Disable line dragging for now
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    style={{
                      ...provided.draggableProps.style,
                      marginBottom: "12px",
                    }}
                  >
                    {/* Fields Droppable Area */}
                    <Droppable droppableId={line.id} type="FIELD">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{
                            backgroundColor: snapshot.isDraggingOver 
                              ? "rgba(0, 102, 204, 0.03)" 
                              : "transparent",
                            borderRadius: "4px",
                            padding: snapshot.isDraggingOver ? "4px" : "0",
                            transition: "background-color 0.2s ease",
                          }}
                        >
                          <LineItem
                            line={line}
                            isActive={activeSettingId === line.id}
                            onSettingsClick={onSettingsClick}
                            updateLineSettings={updateLineSettings}
                            onToggleField={onToggleField}
                            onRemoveField={onRemoveField}
                            isDraggingOver={snapshot.isDraggingOver}
                          />
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
export default DragDropManager;