import { LineItem } from '../LineItem/LineItem';

export const SimpleDesign = ({
  lines,
  activeSettingId,
  onSettingsClick,
  updateLineSettings,
  onToggleField,
  onRemoveField,
  allFields,
  onDragEnd,
}) => (
  <s-box paddingBlock="small">
    <s-stack vertical gap="small" style={{ marginTop: '12px' }}>
        {lines.map((line) => (
         <LineItem
         line={line}
         isActive={activeSettingId === line.id}
         onSettingsClick={() => onSettingsClick(line.id)}
         updateLineSettings={updateLineSettings}
         onToggleField={onToggleField}
         onRemoveField={onRemoveField}
         allFields={allFields}
       />
        ))}
    </s-stack>
  </s-box>
);