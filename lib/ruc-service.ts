// Servicio para consultar RUC en la API de CNID
export interface RucResponse {
  code: number;
  name: string;
  status: string;
  biller: string;
}

export interface RucValidationResult {
  isValid: boolean;
  data?: RucResponse;
  error?: string;
}

/**
 * Consulta la información de un RUC en la API de CNID a través de nuestra API interna
 * @param ruc - Número de RUC a consultar
 * @returns Información del RUC o error
 */
export async function consultarRuc(ruc: string): Promise<RucValidationResult> {
  // Limpiar el RUC (remover espacios, guiones, etc.)
  const cleanRuc = ruc.replace(/\D/g, '');
  
  // Validar formato básico de RUC paraguayo
  if (!cleanRuc || cleanRuc.length < 6 || cleanRuc.length > 9) {
    return {
      isValid: false,
      error: 'Formato de RUC inválido'
    };
  }

  try {
    // Usar nuestra API interna para evitar problemas de CORS
    const response = await fetch(`/api/ruc?ruc=${cleanRuc}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        isValid: false,
        error: errorData.error || 'Error al consultar el RUC'
      };
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      return {
        isValid: false,
        error: 'RUC no encontrado o inválido'
      };
    }

    return {
      isValid: true,
      data: result.data
    };

  } catch (error) {
    console.error('Error al consultar RUC:', error);
    return {
      isValid: false,
      error: 'Error de conexión al consultar el RUC'
    };
  }
}

/**
 * Valida el formato de un RUC paraguayo
 * @param ruc - RUC a validar
 * @returns true si el formato es válido
 */
export function isValidRucFormat(ruc: string): boolean {
  const cleanRuc = ruc.replace(/\D/g, '');
  return cleanRuc.length >= 6 && cleanRuc.length <= 9;
}

/**
 * Formatea un RUC para mostrar con guión
 * @param ruc - RUC a formatear
 * @returns RUC formateado (ej: 80000000-0)
 */
export function formatRuc(ruc: string): string {
  const cleanRuc = ruc.replace(/\D/g, '');
  if (cleanRuc.length <= 8) {
    return cleanRuc;
  }
  return `${cleanRuc.slice(0, -1)}-${cleanRuc.slice(-1)}`;
}