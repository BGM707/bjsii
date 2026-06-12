import Swal from 'sweetalert2';
import type { SweetAlertResult } from 'sweetalert2';

// Custom theme for dark mode support
const getThemeClass = () => {
  if (typeof window !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'swal-dark-theme' : 'swal-light-theme';
  }
  return 'swal-light-theme';
};

// Base configuration
const baseConfig = {
  customClass: {
    popup: 'rounded-xl',
    title: 'text-lg font-semibold',
    htmlContainer: 'text-sm',
    confirmButton: 'px-4 py-2 rounded-lg font-medium transition-all',
    cancelButton: 'px-4 py-2 rounded-lg font-medium transition-all',
    actions: 'gap-3',
  },
  buttonsStyling: false,
};

// Success Alert
export const showSuccess = async (
  title: string,
  html?: string,
  timer: number = 3000
): Promise<SweetAlertResult> => {
  return Swal.fire({
    ...baseConfig,
    icon: 'success',
    title,
    html: html || '',
    timer,
    timerProgressBar: true,
    showConfirmButton: timer === 0,
    confirmButtonText: 'Aceptar',
    confirmButtonColor: '#10b981',
    backdrop: true,
  });
};

// Error Alert
export const showError = async (
  title: string,
  html?: string
): Promise<SweetAlertResult> => {
  return Swal.fire({
    ...baseConfig,
    icon: 'error',
    title,
    html: html || '',
    showConfirmButton: true,
    confirmButtonText: 'Entendido',
    confirmButtonColor: '#ef4444',
  });
};

// Warning Alert
export const showWarning = async (
  title: string,
  html?: string
): Promise<SweetAlertResult> => {
  return Swal.fire({
    ...baseConfig,
    icon: 'warning',
    title,
    html: html || '',
    showConfirmButton: true,
    confirmButtonText: 'Entendido',
    confirmButtonColor: '#f59e0b',
  });
};

// Info Alert
export const showInfo = async (
  title: string,
  html?: string,
  timer: number = 4000
): Promise<SweetAlertResult> => {
  return Swal.fire({
    ...baseConfig,
    icon: 'info',
    title,
    html: html || '',
    timer,
    timerProgressBar: timer > 0,
    showConfirmButton: timer === 0,
    confirmButtonText: 'Aceptar',
    confirmButtonColor: '#3b82f6',
  });
};

// Confirmation Dialog
export const showConfirm = async (
  title: string,
  html: string,
  confirmText: string = 'Confirmar',
  cancelText: string = 'Cancelar',
  icon: 'warning' | 'question' | 'info' = 'warning'
): Promise<boolean> => {
  const result = await Swal.fire({
    ...baseConfig,
    icon,
    title,
    html,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: icon === 'warning' ? '#ef4444' : '#3b82f6',
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
    focusCancel: true,
  });

  return result.isConfirmed;
};

// Delete Confirmation (dangerous action)
export const showDeleteConfirm = async (
  itemName: string,
  details?: string
): Promise<boolean> => {
  const result = await Swal.fire({
    ...baseConfig,
    icon: 'warning',
    title: `¿Eliminar ${itemName}?`,
    html: details || 'Esta acción no se puede deshacer.',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
    focusCancel: true,
    input: 'text',
    inputPlaceholder: 'Escribe "ELIMINAR" para confirmar',
    inputValidator: (value) => {
      if (value !== 'ELIMINAR') {
        return 'Debes escribir ELIMINAR para confirmar';
      }
      return null;
    },
  });

  return result.isConfirmed;
};

// Progress Alert
export const showProgress = (
  title: string,
  html?: string
): typeof Swal => {
  Swal.fire({
    ...baseConfig,
    title,
    html: html || 'Procesando...',
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
  return Swal;
};

// Update progress message
export const updateProgress = (html: string): void => {
  const content = Swal.getHtmlContainer();
  if (content) {
    content.innerHTML = html;
  }
};

// Close progress alert
export const closeProgress = (): void => {
  Swal.close();
};

// Toast notification (small, non-blocking)
export const showToast = (
  icon: 'success' | 'error' | 'warning' | 'info',
  title: string,
  timer: number = 3000
): void => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });

  Toast.fire({ icon, title });
};

// Input Dialog
export const showInputDialog = async (
  title: string,
  placeholder: string,
  inputType: 'text' | 'email' | 'number' | 'textarea' = 'text',
  inputValue?: string
): Promise<string | null> => {
  const result = await Swal.fire({
    ...baseConfig,
    title,
    input: inputType,
    inputPlaceholder: placeholder,
    inputValue: inputValue || '',
    showCancelButton: true,
    confirmButtonText: 'Aceptar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#3b82f6',
    cancelButtonColor: '#6b7280',
    inputValidator: (value) => {
      if (!value.trim()) {
        return 'Este campo es requerido';
      }
      return null;
    },
  });

  return result.isConfirmed ? result.value : null;
};

// Select Dialog
export const showSelectDialog = async (
  title: string,
  options: { value: string; label: string }[],
  selectedValue?: string
): Promise<string | null> => {
  const result = await Swal.fire({
    ...baseConfig,
    title,
    input: 'select',
    inputOptions: Object.fromEntries(options.map(o => [o.value, o.label])),
    inputValue: selectedValue || '',
    showCancelButton: true,
    confirmButtonText: 'Seleccionar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#3b82f6',
    cancelButtonColor: '#6b7280',
  });

  return result.isConfirmed ? result.value : null;
};

// Multi-step form dialog
export const showMultiStepDialog = async (
  steps: { title: string; html: string; inputs?: { key: string; label: string; type: string; value?: string }[] }[]
): Promise<Record<string, string> | null> => {
  const results: Record<string, string> = {};
  let currentStep = 0;
  let cancelled = false;

  while (currentStep < steps.length && !cancelled) {
    const step = steps[currentStep];
    const result = await Swal.fire({
      ...baseConfig,
      title: step.title,
      html: step.html,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: currentStep < steps.length - 1 ? 'Siguiente' : 'Finalizar',
      cancelButtonText: currentStep > 0 ? 'Atras' : 'Cancelar',
      showDenyButton: currentStep > 0,
      denyButtonText: 'Atras',
      confirmButtonColor: '#3b82f6',
      denyButtonColor: '#6b7280',
      cancelButtonColor: '#ef4444',
    });

    if (result.isConfirmed) {
      currentStep++;
    } else if (result.isDenied || result.isDismissed) {
      if (currentStep > 0) {
        currentStep--;
      } else {
        cancelled = true;
      }
    }
  }

  return cancelled ? null : results;
};

// Delete multiple items confirmation
export const showDeleteMultipleConfirm = async (
  count: number,
  itemType: string
): Promise<boolean> => {
  const pluralText = count === 1 ? itemType : `${itemType}s`;
  return showConfirm(
    `¿Eliminar ${count} ${pluralText}?`,
    `<p class="text-red-600 font-semibold">Esta acción eliminará permanentemente ${count} ${pluralText}.</p>
    <p class="text-gray-500 mt-2">Se recomienda exportar un respaldo antes de continuar.</p>`,
    'Sí, eliminar todo',
    'Cancelar'
  );
};

// Import confirmation with details
export const showImportConfirm = async (
  totalRecords: number,
  tableCount: number,
  errors: number
): Promise<boolean> => {
  const errorHtml = errors > 0
    ? `<p class="text-yellow-600"><strong>${errors}</strong> tablas con errores o sin datos</p>`
    : '';

  return showConfirm(
    'Confirmar Importación',
    `<div class="text-left">
      <p><strong>${totalRecords}</strong> registros listos para importar</p>
      <p><strong>${tableCount}</strong> tablas serán actualizadas</p>
      ${errorHtml}
    </div>`,
    'Importar',
    'Cancelar',
    'question'
  );
};

// Export success with details
export const showExportSuccess = async (
  totalRecords: number,
  tableCount: number,
  format: string
): Promise<void> => {
  await showSuccess(
    'Exportación Completada',
    `<div class="text-left">
      <p><strong>${totalRecords}</strong> registros exportados</p>
      <p><strong>${tableCount}</strong> tablas incluidas</p>
      <p>Formato: <strong>${format.toUpperCase()}</strong></p>
    </div>`,
    0
  );
};

export default Swal;
