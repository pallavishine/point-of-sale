import { LineSettings } from '../LineSettings/LineSettings';

export const LineItem = ({
  shop,
  line,
  lines,
  isActive,
  onSettingsClick,
  updateLineSettings,
  onToggleField,
  onRemoveField,
}) => {
  const enabledCount = line.fields.filter((f) => f.enabled).length;
  const maxFields = line.maxFieldSelected;
  const inValid = enabledCount >= maxFields;

  return (
    <s-box padding="small" border="base" background="subdued">
      <s-stack gap="small">
        <s-stack direction="inline" justifyContent="space-between">
          <s-stack direction="inline" alignItems="center" gap="small">
            <s-text weight="medium" >
              {line.label}
            </s-text>
            <s-badge variant={!inValid ? 'success' : 'critical'}>
              {enabledCount}/{maxFields}
            </s-badge>
          </s-stack>
          <s-stack direction="inline" gap="small"  >
            <s-icon
              tone="auto"
              type="settings"
              onClick={() => onSettingsClick(line.id)}
             
            />
            <s-icon
              type={line.enabled ? 'eye' : 'eye-closed'}
              onClick={() => onToggleField(line.id, field.id)}
            />
          </s-stack>
        </s-stack>

        <s-divider />

        {isActive ? (
          <s-box
            padding="base"
            border="base"
            // background="surface"
          >
            <LineSettings line={line} updateLineSettings={updateLineSettings} />
          </s-box>
        ) : (
          <s-stack vertical gap="xtiny">
            {line.fields
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((field, index) => {
                const isEnabled = field.enabled;

                return (
                  // <Draggable
                  //   key={field.id}
                  //   draggableId={field.id} // Use field.id directly as draggableId
                  //   index={index}
                  //   isDragDisabled={!isEnabled}
                  // >
                  //   {(provided, snapshot) => (
                  //     <div
                  //       ref={provided.innerRef}
                  //       {...provided.draggableProps}
                  //       style={{
                  //         ...provided.draggableProps.style,
                  //         marginBottom: '4px',
                  //         opacity: snapshot.isDragging ? 0.8 : isEnabled ? 1 : 0.6,
                  //         transform: snapshot.isDragging ? 'scale(1.02)' : 'none',
                  //         transition: 'all 0.2s ease',
                  //       }}
                  //     >
                        <s-box
                          padding="small"
                        >
                          <s-stack
                            direction="inline"
                            gap="small"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <s-stack
                              direction="inline"
                              gap="small"
                              alignItems="center"
                            >
                              <s-checkbox
                                disabled={!isEnabled && inValid}
                                checked={isEnabled}
                                onChange={() => onToggleField(line.id, field.id)}
                              />
                              
                              {/* Drag Handle */}
                              {/* <div {...provided.dragHandleProps} style={{ display: 'flex', cursor: isEnabled ? 'grab' : 'default' }}>
                                <s-icon 
                                  type="drag-handle" 
                                  style={{ 
                                    // color: snapshot.isDragging ? '#0066cc' : '#999',
                                    opacity: isEnabled ? 1 : 0.3,
                                  }} 
                                />
                              </div> */}
                              
                              <s-icon type={field.icon} />
                              
                              <s-text
                                weight={isEnabled ? 'medium' : 'regular'}
                                
                              >
                                {field.label}
                              </s-text>
                              
                              <s-icon
                                type={isEnabled ? 'eye-check-mark' : 'hide'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isEnabled && inValid) return;
                                  onToggleField(line.id, field.id);
                                }}
                              />
                              
                              <s-icon
                                type="trash"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveField(line.id, field.id);
                                }}
                              />
                            </s-stack>
                          </s-stack>
                        </s-box>
                  //      </div>
                  //   )}
                  // </Draggable> 
                );
              })}

            {/* Add Field Button */}
            {/* <s-stack direction="inline" justifyContent="end">
              <s-button
                variant="secondary"
                inlineSize="fit-content"
                onClick={() => {
                  console.log('Add field to line:', line.id);
                }}
                disabled={line.fields.length >= maxFields}
              >
                + Add Field
              </s-button>
            </s-stack> */}
          </s-stack>
        )}
      </s-stack>
    </s-box>
  );
};