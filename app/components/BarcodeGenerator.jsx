export const generateDummyBarcode = (format = 'code128', value = '1234567890') => {
    const barcodePatterns = {
      code128: {
        lines: [2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 3, 1, 2, 1, 3],
        totalWidth: 40
      },
      ean13: {
        lines: [1, 2, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3],
        totalWidth: 50
      },
      upc: {
        lines: [1, 2, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2],
        totalWidth: 45
      }
    };
  
    const pattern = barcodePatterns[format] || barcodePatterns.code128;
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%' }}>
        <div style={{ display: 'flex', gap: '1px', height: '80%', alignItems: 'center' }}>
          {pattern.lines.map((width, index) => (
            <div
              key={index}
              style={{
                width: `${width}px`,
                height: index % 3 === 0 ? '100%' : '70%',
                backgroundColor: '#000',
                marginRight: '1px'
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: '8px', marginLeft: '4px', color: '#666' }}>
          {value.slice(-6)}
        </span>
      </div>
    );
  };
  
  export const generateDummyQRCode = () => {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '1px',
        width: '100%',
        height: '100%',
        backgroundColor: '#fff',
        padding: '2px'
      }}>
        {Array.from({ length: 49 }).map((_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: Math.random() > 0.5 ? '#000' : '#fff',
              aspectRatio: '1'
            }}
          />
        ))}
      </div>
    );
  };