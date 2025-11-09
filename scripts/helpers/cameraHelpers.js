/**
 * Camera Tile Helper
 * Creates standardized camera tiles with popup iframe
 */

export function createCameraTile (config) {
   const {
      id,
      title,
      position,
      width = 2,
      height = 1,
      hidden,
      refresh = 10000,
      customStyles,
      cameraName,  // Extract from ID if not provided
      baseUrl = 'http://192.168.50.164:8021/web/single-cam.html',
   } = config;

   const camName = cameraName || id.replace('camera.', '');

   return {
      position,
      id,
      type: window.TYPES.CAMERA,
      bgSize: 'cover',
      title,
      width,
      height,
      customStyles,
      state: false,
      hidden,
      action: function (item, entity) {
         this.$scope.openPopupIframe({
            title,
            url: `${baseUrl}?media=video+audio&camera=${camName}&showInitialImageEvenTooOld=true`,
            iframeStyles: {
               width: '100%',
               height: '100%',
               border: 'none',
            },
         });
      },
      refresh,
   };
}

// Export to window
if (typeof window !== 'undefined') {
   window.createCameraTile = createCameraTile;
}
