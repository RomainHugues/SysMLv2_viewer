// Intermediate representation for sequence diagrams.

import type { StyleProps } from "../../style/style";

export interface SeqParticipant {
  id: string;
  name: string;
  style?: StyleProps;
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
