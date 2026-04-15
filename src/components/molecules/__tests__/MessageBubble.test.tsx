import React from 'react';
import {render} from '@testing-library/react-native';
import '../../../i18n';
import {ThemeProvider} from '@theme/index';
import {MessageStatus, MessageType, type Message} from '../../../models';
import {MessageBubble} from '../MessageBubble';

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: () => null,
}));

const baseMessage: Message = {
  id: '123e4567-e89b-12d3-a456-426614174210',
  conversationId: '123e4567-e89b-12d3-a456-426614174211',
  senderId: '123e4567-e89b-12d3-a456-426614174212',
  type: MessageType.TEXT,
  status: MessageStatus.SENT,
  content: 'Hello from GovMobile',
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
};

describe('MessageBubble', () => {
  it('renders sent and received layouts', () => {
    const {getByTestId, getAllByText} = render(
      <ThemeProvider>
        <MessageBubble
          isSentByCurrentUser
          message={baseMessage}
          testID="sent-message"
          timestamp="10:15"
        />
        <MessageBubble
          isSentByCurrentUser={false}
          message={{...baseMessage, id: '123e4567-e89b-12d3-a456-426614174213'}}
          testID="received-message"
          timestamp="10:16"
        />
      </ThemeProvider>,
    );

    expect(getByTestId('sent-message')).toBeTruthy();
    expect(getByTestId('received-message')).toBeTruthy();
    expect(getAllByText('Hello from GovMobile')).toHaveLength(2);
  });

  it('renders text, file, image, and audio content variants', () => {
    const {getByText} = render(
      <ThemeProvider>
        <MessageBubble
          isSentByCurrentUser
          message={baseMessage}
          testID="text-message"
          timestamp="10:15"
        />
        <MessageBubble
          isSentByCurrentUser
          message={{
            ...baseMessage,
            id: '123e4567-e89b-12d3-a456-426614174214',
            type: MessageType.FILE,
            attachmentName: 'report.pdf',
          }}
          testID="file-message"
          timestamp="10:15"
        />
        <MessageBubble
          isSentByCurrentUser
          message={{
            ...baseMessage,
            id: '123e4567-e89b-12d3-a456-426614174215',
            type: MessageType.IMAGE,
            attachmentName: 'photo.jpg',
          }}
          testID="image-message"
          timestamp="10:15"
        />
        <MessageBubble
          isSentByCurrentUser
          message={{
            ...baseMessage,
            id: '123e4567-e89b-12d3-a456-426614174216',
            type: MessageType.AUDIO,
            attachmentName: 'voice-note.m4a',
          }}
          testID="audio-message"
          timestamp="10:15"
        />
      </ThemeProvider>,
    );

    expect(getByText('Hello from GovMobile')).toBeTruthy();
    expect(getByText('File: report.pdf')).toBeTruthy();
    expect(getByText('Image: photo.jpg')).toBeTruthy();
    expect(getByText('Audio: voice-note.m4a')).toBeTruthy();
  });
});
