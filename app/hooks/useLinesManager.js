import { useMemo } from 'react';

export const useLinesManager = (lines) => {
  // ✅ FIX: Guard against null/undefined lines at the top
  const safeLines = useMemo(() => (Array.isArray(lines) ? lines : []), [lines]);

  const selectedFieldsAsLines = useMemo(() => {
    return safeLines
      .filter((line) => line?.enabled && line?.fields?.some((f) => f.enabled))
      .map((line) => ({
        ...line,
        fields: line.fields
          .filter((f) => f.enabled)
          .sort((a, b) => (a.order || 0) - (b.order || 0)),
      }));
  }, [safeLines]);

  const allFields = useMemo(() => {
    return safeLines.flatMap((line) => line?.fields || []);
  }, [safeLines]);

  const enabledFieldsCount = useMemo(() => {
    return safeLines.reduce((count, line) => {
      const fields = Array.isArray(line?.fields) ? line.fields : [];
      // ✅ FIX: Wrap in parentheses so `|| 0` only applies to .length, not the whole sum
      return count + (fields.filter((f) => f?.enabled).length || 0);
    }, 0);
  }, [safeLines]);

  return {
    selectedFieldsAsLines,
    allFields,
    enabledFieldsCount,
  };
};