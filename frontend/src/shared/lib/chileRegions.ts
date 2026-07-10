/** 16 regiões do Chile para o dropdown de endereço do cliente. value = label
 * (texto persistido em client_addresses.region). */
const NAMES = [
  'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo',
  'Valparaíso', "Región Metropolitana de Santiago", "Libertador General Bernardo O'Higgins",
  'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos',
  'Aysén del General Carlos Ibáñez del Campo', 'Magallanes y de la Antártica Chilena',
]

export const CHILE_REGIONS = NAMES.map((n) => ({ label: n, value: n }))
