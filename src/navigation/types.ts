/**
 * @fileoverview Type definitions for the navigation module.
 */
import {type NavigatorScreenParams} from '@react-navigation/native';

// ---------------------------------------------------------------------------
// Auth Stack
// ---------------------------------------------------------------------------

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
};

// ---------------------------------------------------------------------------
// Chat Stack
// ---------------------------------------------------------------------------

export type ChatStackParamList = {
  ConversationList: undefined;
  ChatRoom: {conversationId: string; title: string};
  NewConversation: undefined;
};

// ---------------------------------------------------------------------------
// Calls Stack
// ---------------------------------------------------------------------------

export type CallsStackParamList = {
  CallHistory: undefined;
  ActiveCall: {callId: string};
  IncomingCall: {callId: string};
};

// ---------------------------------------------------------------------------
// Profile Stack
// ---------------------------------------------------------------------------

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
};

// ---------------------------------------------------------------------------
// Servidores Stack
// ---------------------------------------------------------------------------

export type ServidoresStackParamList = {
  ServidoresList: undefined;
  ServidorDetail: {servidorId: string};
};

// ---------------------------------------------------------------------------
// Frota Stack
// ---------------------------------------------------------------------------

export type FrotaStackParamList = {
  FrotaHome: undefined;
};

// ---------------------------------------------------------------------------
// Main Tab
// ---------------------------------------------------------------------------

export type MainTabParamList = {
  HomeTab: undefined;
  ChatTab: NavigatorScreenParams<ChatStackParamList>;
  CallsTab: NavigatorScreenParams<CallsStackParamList>;
  NotificationsTab: undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// ---------------------------------------------------------------------------
// Passageiro Stack
// ---------------------------------------------------------------------------

export type PassageiroStackParamList = {
  PassageiroHome: undefined;
  PassageiroSearch: undefined;
};

// ---------------------------------------------------------------------------
// Passageiro Corridas Stack — USUARIO-only (5 endpoints)
// POST /corridas, POST /corridas/:id/cancelar,
// GET /corridas/:id, GET /corridas/:id/status, GET /corridas/:id/mensagens
// ---------------------------------------------------------------------------

export type PassageiroCorridasStackParamList = {
  PassageiroCorridasList: undefined;
  CorridaDetalhe: {corridaId: string};
  AcompanharCorrida: {corridaId: string};
  CorridaMensagens: {corridaId: string};
  AvaliarCorrida: {corridaId: string};
};

// ---------------------------------------------------------------------------
// Corridas Stack — MOTORISTA-only (full lifecycle)
// ---------------------------------------------------------------------------

export type CorridasStackParamList = {
  CorridasList: undefined;
  CorridaDetalhe: {corridaId: string};
  AcompanharCorrida: {corridaId: string};
  SolicitarCorrida: undefined;
  MotoristaCorridaAction: {corridaId: string};
};

// ---------------------------------------------------------------------------
// Motorista Tab
// ---------------------------------------------------------------------------

export type MotoristaTabParamList = {
  MotoristaHome: undefined;
  MotoristaCorridas: NavigatorScreenParams<MotoristaCorridasStackParamList> | undefined;
  MotoristaNotificacoes: undefined;
  MotoristaProfile: undefined;
};

// ---------------------------------------------------------------------------
// Motorista Corridas Stack — full driver lifecycle
// GET /corridas/contexto, GET /corridas, POST /corridas/:id/aceitar,
// POST /corridas/:id/recusar, POST /corridas/:id/iniciar-deslocamento,
// POST /corridas/:id/chegar, POST /corridas/:id/confirmar-embarque,
// POST /corridas/:id/finalizar, POST /corridas/:id/cancelar,
// GET /corridas/:id, GET /corridas/:id/status, GET /corridas/:id/mensagens
// ---------------------------------------------------------------------------

export type MotoristaCorridasStackParamList = {
  MotoristaCorridasList: undefined;
  MotoristaCorridaDetalhe: {corridaId: string};
  MotoristaCorridaAction: {corridaId: string};
  CorridaMensagens: {corridaId: string};
  VeiculoAssociation: undefined;
};

// ---------------------------------------------------------------------------
// Root Stack
// ---------------------------------------------------------------------------

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Passageiro: NavigatorScreenParams<PassageiroStackParamList>;
  Motorista: NavigatorScreenParams<MotoristaTabParamList>;
};
