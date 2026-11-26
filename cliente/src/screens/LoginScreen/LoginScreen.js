import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import styles from './LoginScreenStyles';
import { useLoginScreen } from './useLoginScreen';

function formatearTiempo(segundos) {
  const m = Math.floor(segundos / 60);
  const s = String(segundos % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function LoginScreen() {
  const {
    usuario,
    setUsuario,
    contrasena,
    setContrasena,
    cargando,
    segundosBloqueo,
    handleLogin,
    handleIrARegistro
  } = useLoginScreen();

  const bloqueado = segundosBloqueo > 0;
  const deshabilitado = cargando || bloqueado;

  return (
    <View style={styles.container}>
      <Text style={styles.title}> MiPerruqueria</Text>
      <Text style={styles.welcome}>¡Bienvenida a MiPerruqueria!</Text>

      <Text style={styles.label}>Usuario</Text>
      <TextInput
        style={styles.input}
        placeholder="Introduce tu usuario"
        value={usuario}
        onChangeText={setUsuario}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput
        style={styles.input}
        placeholder="Introduce tu contraseña"
        secureTextEntry
        value={contrasena}
        onChangeText={setContrasena}
      />

      <TouchableOpacity
        style={[styles.button, deshabilitado && { opacity: 0.5 }]}
        onPress={handleLogin}
        disabled={deshabilitado}
      >
        <Text style={styles.buttonText}>
          {bloqueado ? `Espera ${formatearTiempo(segundosBloqueo)}` : cargando ? 'Entrando...' : 'Iniciar Sesión'}
        </Text>
      </TouchableOpacity>

      {bloqueado && (
        <Text style={[styles.registerText, { marginTop: 14, textAlign: 'center' }]}>
          Demasiados intentos. Inténtalo de nuevo cuando termine la cuenta atrás.
        </Text>
      )}

      <Text style={styles.registerText}>¿No estás registrado?</Text>

      <TouchableOpacity style={styles.registerButton} onPress={handleIrARegistro}>
        <Text style={styles.registerButtonText}>Registrar</Text>
      </TouchableOpacity>
    </View>
  );
}