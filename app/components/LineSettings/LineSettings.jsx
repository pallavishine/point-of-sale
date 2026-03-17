import { TextLineSettings } from './TextLineSettings';
import { BarcodeSettings } from './BarcodeSettings';

export const LineSettings = ({ line, onUpdate }) => {
  if (!line) return null;

  const handleChange = (path, value) => {
    const [section, key] = path.split('.');
    if (section === 'settings') {
      onUpdate({
        ...line,
        settings: { ...line.settings, [key]: value },
      });
    }
  };

  return line.type === 'barcode' ? (
    <BarcodeSettings line={line} onChange={handleChange} />
  ) : (
    <TextLineSettings line={line} onChange={handleChange} />
  );
};