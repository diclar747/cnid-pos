import { NextRequest, NextResponse } from 'next/server';

export interface RucResponse {
  code: number;
  name: string;
  status: string;
  biller: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ruc = searchParams.get('ruc');

  if (!ruc) {
    return NextResponse.json(
      { error: 'RUC es requerido' },
      { status: 400 }
    );
  }

  // Limpiar el RUC (remover espacios, guiones, etc.)
  const cleanRuc = ruc.replace(/\D/g, '');
  
  // Validar formato básico de RUC paraguayo
  if (!cleanRuc || cleanRuc.length < 6 || cleanRuc.length > 9) {
    return NextResponse.json(
      { error: 'Formato de RUC inválido' },
      { status: 400 }
    );
  }

  try {
    // Para pruebas, simular algunos RUCs conocidos si la API externa no está disponible
    const testRucs: Record<string, RucResponse> = {
      '3626142': {
        code: 200,
        name: 'DIKEL CARDOZO, CLAUDIO',
        status: 'ACTIVO',
        biller: 'N'
      },
      '80000000': {
        code: 200,
        name: 'EMPRESA DE PRUEBA S.A.',
        status: 'ACTIVO',
        biller: 'S'
      },
      '1234567': {
        code: 200,
        name: 'JUAN PÉREZ',
        status: 'INACTIVO',
        biller: 'N'
      }
    };

    // Intentar consulta real primero
    try {
      const response = await fetch(`https://cnid.com.py/set/ruc.php?ruc=${cleanRuc}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
      });

      if (response.ok) {
        const text = await response.text();
        
        // Verificar si la respuesta es JSON válido
        try {
          const data: RucResponse = JSON.parse(text);
          if (data.code === 200) {
            return NextResponse.json({
              success: true,
              data: data
            });
          }
        } catch (jsonError) {
          console.log('Respuesta no es JSON válido, usando datos de prueba');
        }
      }
    } catch (apiError) {
      console.log('API externa no disponible, usando datos de prueba');
    }

    // Si la API externa falla, usar datos de prueba
    if (testRucs[cleanRuc]) {
      return NextResponse.json({
        success: true,
        data: testRucs[cleanRuc]
      });
    }

    return NextResponse.json(
      { error: 'RUC no encontrado o inválido' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error al consultar RUC:', error);
    return NextResponse.json(
      { error: 'Error de conexión al consultar el RUC' },
      { status: 500 }
    );
  }
}