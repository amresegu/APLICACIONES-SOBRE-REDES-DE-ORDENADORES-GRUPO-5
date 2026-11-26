import {
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import estilos from "./VerResenasScreenStyles";
import { useVerResenasScreen } from "./useVerResenasScreen";

export default function VerResenasScreen() {
  const { resenas, cargando, error, volver } = useVerResenasScreen();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        estilos.contenedor,
        {
          // Respeta la barra de estado y la barra de navegación de cada móvil
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 12,
        },
      ]}
    >
      <Text style={estilos.titulo}>Ver reseñas</Text>

      <View style={estilos.contenido}>
        {cargando ? (
          <View style={estilos.estadoCentrado}>
            <ActivityIndicator size="large" color="#6B6259" />
          </View>
        ) : error ? (
          <View style={estilos.estadoCentrado}>
            <Text style={estilos.mensajeError}>{error}</Text>
          </View>
        ) : resenas.length === 0 ? (
          <View style={estilos.estadoCentrado}>
            <Text style={estilos.mensaje}>
              Todavía no hay reseñas disponibles.
            </Text>
          </View>
        ) : (
          <FlatList
            style={estilos.lista}
            data={resenas}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={estilos.listaContenedor}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const estrellas = Math.max(
                0,
                Math.min(5, Math.round(Number(item.puntuacion) || 0))
              );

              return (
                <View style={estilos.tarjetaResena}>
                  <Text style={estilos.usuarioResena}>
                    Usuario: {item.usuario}
                  </Text>
                  <Text style={estilos.puntuacionResena}>
                    Puntuación: {"⭐".repeat(estrellas)}
                  </Text>
                  <Text style={estilos.comentarioResena}>
                    Comentario: {item.comentario}
                  </Text>
                </View>
              );
            }}
          />
        )}
      </View>

      <TouchableOpacity style={estilos.botonVolver} onPress={volver}>
        <Text style={estilos.textoBotonVolver}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}