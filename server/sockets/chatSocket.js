export function setupChatSocket(io, socket) {
  // Real-time Text Message
  socket.on('chat:message', ({ roomId, message }) => {
    const payload = {
      id: Date.now().toString(),
      type: 'text',
      userId: socket.data.userId,
      username: socket.data.username || 'Player',
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    io.to(`room:${roomId}`).emit('chat:message', payload);
  });

  // Animated Sticker reaction (e.g. "GG", "🔥", "Nice!", "😡", "🎉")
  socket.on('chat:sticker', ({ roomId, sticker }) => {
    const payload = {
      id: Date.now().toString(),
      type: 'sticker',
      userId: socket.data.userId,
      username: socket.data.username || 'Player',
      content: sticker,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    io.to(`room:${roomId}`).emit('chat:sticker', payload);
  });

  // In-Game Audio Message
  socket.on('chat:audio', ({ roomId, audioData, duration }) => {
    const payload = {
      id: Date.now().toString(),
      type: 'audio',
      userId: socket.data.userId,
      username: socket.data.username || 'Player',
      audioData, // Base64 or URL
      duration,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    io.to(`room:${roomId}`).emit('chat:audio', payload);
  });
}
