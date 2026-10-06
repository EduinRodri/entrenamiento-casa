'use strict';
/*
  Plan de entrenamiento.
  type: 'reps' (rango min-max), 'max' (al máximo dejando 1 en reserva), 'time' (segundos).
  bw: true  → peso corporal, no se registra peso.
  side: texto que se añade al esquema ("por lado", "por pierna").
  alt: variante que se puede elegir ese día.
*/
const PLAN = {
  torsoA: {
    id: 'torsoA',
    name: 'Torso A',
    exercises: [
      { id: 'dominadas-prono', name: 'Dominadas prono', type: 'max', sets: 4, rest: 120, bw: true,
        tips: ['Agarre un poco más ancho que los hombros, palmas hacia adelante.',
               'Empieza colgado con los brazos estirados y baja las escápulas antes de tirar.',
               'Sube hasta pasar la barbilla y baja controlado, sin balanceo.'] },
      { id: 'press-piso', name: 'Press de piso con dos mancuernas', type: 'reps', sets: 3, min: 8, max: 12, rest: 120,
        tips: ['Acostado en el piso con las rodillas dobladas y los codos a unos 45° del cuerpo.',
               'Baja hasta que el tríceps toque el piso; pausa breve, sin rebotar.',
               'Empuja las mancuernas hacia arriba y un poco hacia el centro.'] },
      { id: 'remo-una-mano', name: 'Remo a una mano apoyado en silla', type: 'reps', sets: 3, min: 10, max: 15, side: 'por lado', rest: 90,
        tips: ['Mano y rodilla apoyadas en la silla, espalda plana.',
               'Tira llevando el codo hacia la cadera, no hacia arriba.',
               'Baja estirando del todo sin girar el torso.'] },
      { id: 'curl-biceps', name: 'Curl de bíceps', type: 'reps', sets: 3, min: 8, max: 12, rest: 60,
        tips: ['Codos pegados al costado y quietos.',
               'Sube sin impulso de cadera.',
               'Baja en 2 o 3 segundos.'] },
      { id: 'triceps-cabeza', name: 'Extensión de tríceps sobre la cabeza', type: 'reps', sets: 3, min: 10, max: 15, rest: 60,
        tips: ['Una mancuerna con las dos manos por encima de la cabeza.',
               'Baja detrás de la cabeza con los codos apuntando al frente.',
               'Abdomen apretado para no arquear la espalda baja.'] },
      { id: 'elev-laterales', name: 'Elevaciones laterales', type: 'reps', sets: 3, min: 12, max: 20, rest: 60,
        tips: ['Codos un poco doblados; sube hasta la altura de los hombros.',
               'Piensa en llevar los codos hacia afuera, no las manos.',
               'Peso ligero y controlado, sin balancear.'] },
      { id: 'curl-muneca', name: 'Curl de muñeca', type: 'reps', sets: 2, min: 15, max: 20, rest: 60,
        tips: ['Antebrazos apoyados en los muslos, palmas hacia arriba.',
               'Deja rodar la mancuerna hasta los dedos y vuelve a cerrar.',
               'Mueve solo la muñeca.'] }
    ]
  },
  piernaA: {
    id: 'piernaA',
    name: 'Pierna A',
    exercises: [
      { id: 'bulgara', name: 'Sentadilla búlgara con dos mancuernas', type: 'reps', sets: 4, min: 8, max: 12, side: 'por pierna', rest: 120,
        tips: ['Pie de atrás sobre una silla o la cama, con el empeine apoyado.',
               'Baja recto hasta que la rodilla de atrás casi toque el piso.',
               'Empuja con el talón del pie de adelante; rodilla en línea con el pie.'] },
      { id: 'prm', name: 'Peso muerto rumano con dos mancuernas', type: 'reps', sets: 3, min: 10, max: 15, rest: 120,
        tips: ['Rodillas un poco dobladas y fijas; lleva la cadera hacia atrás.',
               'Mancuernas pegadas a las piernas y espalda neutra.',
               'Baja hasta sentir el estiramiento detrás del muslo y sube apretando glúteos.'] },
      { id: 'goblet-pausa', name: 'Sentadilla goblet con pausa', type: 'reps', sets: 3, min: 10, max: 15, rest: 90,
        tips: ['Una mancuerna vertical pegada al pecho.',
               'Baja con el pecho alto y quédate 2 s abajo, sin rebotar.',
               'Las rodillas siguen la dirección de los pies.'] },
      { id: 'talon-una', name: 'Elevación de talón a una pierna en escalón', type: 'reps', sets: 4, min: 10, max: 15, side: 'por pierna', rest: 60,
        tips: ['Punta del pie en el borde de un escalón; sujétate de algo.',
               'Baja el talón todo lo posible y sube al máximo.',
               'Pausa de 1 s arriba.'] },
      { id: 'elev-piernas', name: 'Elevación de piernas colgado', type: 'reps', sets: 3, min: 8, max: 15, rest: 60, bw: true,
        tips: ['Colgado de la barra, sin balancearte.',
               'Sube las piernas curvando la pelvis; dobla las rodillas si hace falta.',
               'Baja lento y controlado.'] }
    ]
  },
  torsoB: {
    id: 'torsoB',
    name: 'Torso B',
    exercises: [
      { id: 'dominadas-supinas', name: 'Dominadas supinas', type: 'max', sets: 4, rest: 120, bw: true,
        tips: ['Palmas hacia ti, al ancho de los hombros.',
               'Baja las escápulas y tira con los codos hacia las costillas.',
               'Rango completo: brazos estirados abajo, barbilla sobre la barra arriba.'] },
      { id: 'remo-inclinado', name: 'Remo inclinado con dos mancuernas', type: 'reps', sets: 3, min: 10, max: 15, rest: 90,
        tips: ['Cadera atrás, espalda plana, torso casi paralelo al piso.',
               'Tira de las dos mancuernas hacia la cadera.',
               'Aprieta las escápulas arriba y baja controlado.'] },
      { id: 'press-hombro', name: 'Press de hombro sentado', type: 'reps', sets: 3, min: 8, max: 12, rest: 90,
        tips: ['Sentado con la espalda apoyada, mancuernas a la altura de las orejas.',
               'Empuja hacia arriba sin bloquear los codos de golpe.',
               'Costillas abajo: no arquees la espalda.'] },
      { id: 'fondos', name: 'Fondos', type: 'reps', sets: 3, min: 8, max: 15, rest: 90, bw: true,
        tips: ['Inclina un poco el torso hacia adelante.',
               'Baja hasta que los hombros queden a la altura de los codos; menos si molesta.',
               'Si el hombro molesta, cambia hoy a flexiones diamante.'],
        alt: { name: 'Flexiones diamante',
               tips: ['Manos juntas formando un diamante debajo del pecho.',
                      'Cuerpo recto de la cabeza a los talones.',
                      'Codos pegados al cuerpo al bajar.'] } },
      { id: 'curl-martillo', name: 'Curl martillo', type: 'reps', sets: 3, min: 8, max: 12, rest: 60,
        tips: ['Palmas mirándose entre sí todo el recorrido.',
               'Codos quietos al costado.',
               'Baja lento.'] },
      { id: 'triceps-acostado', name: 'Extensión de tríceps acostado', type: 'reps', sets: 3, min: 10, max: 15, rest: 60,
        tips: ['Acostado en el piso, mancuernas sobre el pecho con las palmas enfrentadas.',
               'Dobla solo los codos y baja las mancuernas junto a la cabeza.',
               'Brazos fijos apuntando al techo.'] },
      { id: 'pajaros', name: 'Pájaros', type: 'reps', sets: 2, min: 15, max: 20, rest: 60,
        tips: ['Inclinado hacia adelante con la espalda plana.',
               'Abre los brazos hacia los lados con los codos un poco doblados.',
               'Peso ligero: piensa en llevar las manos lejos, no arriba.'] }
    ]
  },
  piernaB: {
    id: 'piernaB',
    name: 'Pierna B',
    exercises: [
      { id: 'prm-una', name: 'Peso muerto rumano a una pierna', type: 'reps', sets: 3, min: 8, max: 12, side: 'por pierna', rest: 90,
        tips: ['Apóyate en la pared con una mano si pierdes el equilibrio.',
               'Cadera atrás mientras la pierna libre sube en línea con el torso.',
               'Cadera cuadrada hacia el piso, sin abrirse.'] },
      { id: 'zancada-atras', name: 'Zancada hacia atrás', type: 'reps', sets: 3, min: 10, max: 12, side: 'por pierna', rest: 90,
        tips: ['Paso largo hacia atrás y baja la rodilla casi al piso.',
               'Torso recto, peso en el talón de adelante.',
               'Empuja con la pierna de adelante para volver.'] },
      { id: 'granjero', name: 'Caminata del granjero', type: 'time', sets: 2, min: 40, max: 60, rest: 60,
        tips: ['Una mancuerna pesada en cada mano, hombros abajo y atrás.',
               'Camina con pasos cortos y el abdomen apretado.',
               'Agarra fuerte; para si pierdes la postura.'] },
      { id: 'hip-thrust-una', name: 'Hip thrust a una pierna', type: 'reps', sets: 3, min: 10, max: 15, side: 'por pierna', rest: 60,
        tips: ['Espalda alta apoyada en el borde del sofá o la cama.',
               'Empuja con el talón hasta que cadera y torso queden rectos.',
               'Aprieta el glúteo 1 s arriba; mancuerna sobre la cadera para más carga.'] },
      { id: 'nordico', name: 'Curl nórdico', type: 'reps', sets: 3, min: 4, max: 8, rest: 120, bw: true,
        tips: ['Rodillas sobre un cojín y talones trabados bajo un mueble firme.',
               'Baja lo más lento posible con la cadera estirada.',
               'Al final ayúdate con las manos y empuja para volver.'] },
      { id: 'talon', name: 'Elevación de talón', type: 'reps', sets: 4, min: 12, max: 20, rest: 60,
        tips: ['En el borde del escalón con las dos piernas.',
               'Baja el talón al máximo y sube al máximo.',
               'Pausa de 1 s arriba.'] },
      { id: 'crunch', name: 'Crunch con mancuerna en el pecho', type: 'reps', sets: 3, min: 10, max: 15, rest: 60,
        tips: ['Acostado con las rodillas dobladas y la mancuerna sobre el pecho.',
               'Sube enrollando la columna, barbilla un poco metida.',
               'Baja controlado, sin dejarte caer.'] }
    ]
  }
};

const SESSION_ORDER = ['torsoA', 'piernaA', 'torsoB', 'piernaB'];

const WARMUP = [
  'Círculos de brazos: 30 s hacia adelante y 30 s hacia atrás',
  '10 flexiones fáciles',
  'Colgarse de la barra 20 s',
  '10 sentadillas sin peso'
];

const REMINDERS = [
  'Termina cada serie con 1-2 repeticiones en reserva.',
  'Aprieta las roscas de las mancuernas antes de cada serie.',
  'Si un ejercicio molesta el hombro más de 3/10, cámbialo ese día.'
];

/*
  Espacio para animaciones. Cuando tengas una, agrégala aquí con el id del ejercicio:
    'press-piso': 'animaciones/press-piso.webp'
  La pantalla de sesión la muestra sola; no hay que tocar nada más.
*/
const ANIMACIONES = {};
