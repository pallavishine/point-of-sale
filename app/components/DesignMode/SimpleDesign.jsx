import { DragDropContext, Droppable } from 'react-beautiful-dnd';
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
      <DragDropContext onDragEnd={onDragEnd}>
        {lines.map((line) => (
          <Droppable key={line.id} droppableId={line.id}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                <LineItem
                  line={line}
                  isActive={activeSettingId === line.id}
                  onSettingsClick={() => onSettingsClick(line.id)}
                  updateLineSettings={updateLineSettings}
                  onToggleField={onToggleField}
                  onRemoveField={onRemoveField}
                  allFields={allFields}
                />
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </DragDropContext>
    </s-stack>
  </s-box>
);