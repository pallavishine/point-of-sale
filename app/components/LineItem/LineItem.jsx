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
      <s-stack gap="small-400">
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
          >
            <LineSettings line={line} updateLineSettings={updateLineSettings} />
          </s-box>
        ) : (
          <s-stack  gap="small-400">
            {line.fields
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((field, index) => {
                const isEnabled = field.enabled;

                return (
                        <s-box
                          padding="small-200" paddingBlock='small-400'
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
                 
                );
              })}
          </s-stack>
        )}
      </s-stack>
    </s-box>
  );
};