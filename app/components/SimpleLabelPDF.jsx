import React from "react";
import { Page, Document, StyleSheet, View, Text } from "@react-pdf/renderer";


const SimpleLabelPDF = ({ title, description, lines, pageSize, quantity }) => {
  const styles = StyleSheet.create({
    page: {
      backgroundColor: "white",
      padding: 20,
    },
    title: {
      fontSize: 24,
      textAlign: "center",
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      textAlign: "center",
    },
  });
  const labelsPerSheet = pageSize.columns * pageSize.rows;
  const numberOfSheets = Math.ceil(quantity / labelsPerSheet);
  return (
    <Document>
      {Array.from({ length: numberOfSheets }).map((_, sheetIndex) => (
        <Page key={sheetIndex} size="A4" style={styles.page}>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{description}</Text>
          </View>
          <View
            style={{
              width: "100%",
              height: "100%",
              flexDirection: "row",
              flexWrap: "wrap",
            }}
          >
            {Array.from({ length: labelsPerSheet }).map((_, labelIndex) => {
              const labelNumber = sheetIndex * labelsPerSheet + labelIndex;
              if (labelNumber >= quantity) return null;

              return (
                <View
                  key={labelIndex}
                  style={{
                    width: `${100 / pageSize.columns}%`,
                    height: `${100 / pageSize.rows}%`,
                    padding: 2,
                  }}
                >
                  <View style={styles.label}>
                    <Text style={styles.text}>Label #{labelNumber + 1}</Text>
                    <Text style={[styles.text, { fontSize: 6 }]}>
                      Test Product
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Page>
      ))}
    </Document>
  );
};

export default SimpleLabelPDF;
