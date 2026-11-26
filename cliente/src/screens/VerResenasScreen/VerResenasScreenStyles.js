import { Platform, StyleSheet } from "react-native";

const fuente = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia, 'Times New Roman', serif",
});

const ANCHO_MAXIMO = 600;

const suave = {
  shadowColor: "#8E3E63",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 3,
};

const tituloBase = {
  fontFamily: fuente,
  fontWeight: "bold",
  fontStyle: "italic",
  color: "#A8537A",
  letterSpacing: 1,
  textShadowColor: "#FFFFFF",
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 0,
};

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#FDF7F9",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  titulo: {
    ...tituloBase,
    fontSize: 32,
    textAlign: "center",
    marginBottom: 16,
    alignSelf: "stretch",
  },
  contenido: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    maxWidth: ANCHO_MAXIMO,
  },
  estadoCentrado: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  mensaje: {
    fontFamily: fuente,
    fontSize: 16,
    fontStyle: "italic",
    color: "#8A697A",
    textAlign: "center",
    lineHeight: 24,
  },
  mensajeError: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
  },
  lista: {
    flex: 1,
    width: "100%",
  },
  listaContenedor: {
    paddingTop: 4,
    paddingBottom: 16,
    paddingHorizontal: 2,
  },
  tarjetaResena: {
    alignSelf: "stretch",
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginVertical: 8,
    borderRadius: 24,
    ...suave,
  },
  usuarioResena: {
    flexShrink: 1,
    fontFamily: fuente,
    fontSize: 18,
    fontWeight: "bold",
    fontStyle: "italic",
    color: "#A8537A",
    marginBottom: 6,
  },
  puntuacionResena: {
    flexShrink: 1,
    fontSize: 16,
    color: "#D4A359",
    marginBottom: 8,
  },
  comentarioResena: {
    flexShrink: 1,
    fontSize: 15,
    color: "#3D2232",
    lineHeight: 22,
  },
  botonVolver: {
    width: "100%",
    maxWidth: ANCHO_MAXIMO,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 12,
    borderRadius: 26,
    backgroundColor: "#EADAE4",
    alignItems: "center",
    ...suave,
  },
  textoBotonVolver: {
    fontFamily: fuente,
    fontSize: 17,
    fontWeight: "bold",
    color: "#3D2232",
    letterSpacing: 0.8,
  },
});

export default estilos;