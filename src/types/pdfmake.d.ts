declare module 'pdfmake/build/pdfmake' {
  const pdfMake: {
    createPdf: (docDefinition: any) => {
      download: (filename?: string) => void;
      open: () => void;
      print: () => void;
      getDataUrl: (callback: (dataUrl: string) => void) => void;
      getBlob: (callback: (blob: Blob) => void) => void;
    };
    vfs?: any;
    fonts?: any;
  };
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfFonts: any;
  export default pdfFonts;
}

