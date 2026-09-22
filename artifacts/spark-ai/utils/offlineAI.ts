// Coincide solo con palabras completas (\b de JS no reconoce las tildes).
const W = (alternatives: string) =>
  new RegExp(`(?<![\\p{L}])(?:${alternatives})(?![\\p{L}])`, "iu");

type Response = string | (() => string);

const OFFLINE_RESPONSES: { patterns: RegExp[]; responses: Response[] }[] = [
  {
    patterns: [W("hola|buenos días|buenas tardes|buenas noches|hey|hi")],
    responses: [
      "¡Hola! Estoy en modo offline, así que mis respuestas son limitadas. ¿En qué puedo ayudarte?",
      "¡Hola! Funciono sin internet en este momento. Puedo responder preguntas básicas.",
    ],
  },
  {
    patterns: [W("cómo estás|como estás|qué tal|que tal")],
    responses: [
      "¡Funcionando perfectamente en modo offline! ¿Y tú cómo estás?",
      "Todo bien, aunque sin conexión a internet mis capacidades son limitadas.",
    ],
  },
  {
    patterns: [W("qué eres|que eres|quién eres|quien eres|qué es spark|que es spark")],
    responses: [
      "Soy Spark, tu asistente de IA personal. En modo offline puedo responder preguntas básicas. Conéctate a internet para acceder a mis capacidades completas con Spark 3.5 Flash o Spark 3.1 Pro.",
    ],
  },
  {
    patterns: [W("cuánto es|cuanto es|suma|resta|multiplica|divide"), /\d+\s*[+\-*\/]\s*\d+/],
    responses: [
      "Puedo ayudarte con operaciones básicas en modo offline. Para cálculos complejos, conéctate a internet.",
    ],
  },
  {
    patterns: [W("gracias|muchas gracias|thanks?")],
    responses: [
      "¡De nada! Si necesitas respuestas más completas, conecta tu dispositivo a internet.",
      "¡Con gusto! Recuerda que en modo online tengo muchas más capacidades.",
    ],
  },
  {
    patterns: [W("chiste|broma|cuéntame algo")],
    responses: [
      "¿Por qué los programadores prefieren el modo oscuro? ¡Porque la luz atrae a los bugs! 🐛",
      "¿Qué le dice un bit al otro? Nos vemos en el bus.",
      "¿Por qué Spark está en modo offline? Porque quería tomarse un descanso del internet. 😄",
    ],
  },
  {
    patterns: [W("clima|temperatura|lluvia")],
    responses: [
      "Lo siento, no puedo consultar el clima en modo offline. Conecta tu dispositivo a internet para obtener información meteorológica actualizada.",
    ],
  },
  {
    patterns: [W("hora|qué hora es|que hora es")],
    responses: [
      () =>`En este momento son las ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.`,
    ],
  },
  {
    patterns: [W("fecha|qué día es|que dia es|hoy es")],
    responses: [
      () =>`Hoy es ${new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
    ],
  },
  {
    patterns: [W("offline|sin internet|sin conexión|sin conexion")],
    responses: [
      "Así es, estás usando Spark Offline. Este modo funciona sin internet y puede responder preguntas básicas, decirte la hora y fecha, contar chistes y mantener conversaciones simples. Para respuestas avanzadas, cambia a Spark 3.5 Flash o Spark 3.1 Pro con conexión a internet.",
    ],
  },
];

const FALLBACK_RESPONSES = [
  "Estoy en modo offline con capacidades limitadas. Para esta pregunta necesito conexión a internet. Cambia a Spark 3.5 Flash para una respuesta completa.",
  "En modo offline no puedo responder preguntas complejas. Conéctate a internet y usa Spark 3.5 Flash o Spark 3.1 Pro.",
  "Esta pregunta requiere acceso a internet. Spark Offline solo puede responder preguntas básicas como la hora, fecha, chistes o saludos.",
  "Hmm, eso está fuera de mis capacidades offline. ¿Tienes conexión a internet? Prueba Spark 3.5 Flash para una respuesta completa.",
];

export function getOfflineResponse(input: string): string {
  for (const { patterns, responses } of OFFLINE_RESPONSES) {
    if (patterns.some((p) => p.test(input))) {
      const r = responses[Math.floor(Math.random() * responses.length)];
      return typeof r === "function" ? r() : r;
    }
  }
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}
