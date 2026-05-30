// Intermediate representation for sequence diagrams.

export interface SeqParticipant {
  id: string;
  name: string;
}

export interface SeqMessage {
  from: string;
  to: string;
  label?: string;
}

export interface SequenceModel {
  participants: SeqParticipant[];
  messages: SeqMessage[];
}
