import React from 'react';
import FileCard from './FileCard';

const ChatMessage = ({ message, isUser }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`chat-message ${isUser ? 'user-message' : 'assistant-message'}`}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
        {!isUser && message.files && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-300 mb-2">Generated Files:</p>
            {message.files.cad && (
              <FileCard
                filename={message.files.cad}
                designId={message.designId}
                type="cad"
              />
            )}
            {message.files.description && (
              <FileCard
                filename={message.files.description}
                designId={message.designId}
                type="description"
              />
            )}
          </div>
        )}
        
        <p className="text-xs text-gray-400 mt-2">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;
