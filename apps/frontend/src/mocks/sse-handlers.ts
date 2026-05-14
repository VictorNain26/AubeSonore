import { sse } from 'msw';
import { makeNowPlaying } from './handlers';

const AZURA = 'https://radio.aubesonore.fr';

export const sseHandlers = [
  sse(`${AZURA}/api/live/nowplaying/sse`, ({ client }) => {
    client.send({
      data: JSON.stringify({
        connect: {
          subs: {
            'station:aubesonore': {
              publications: [{ data: { np: makeNowPlaying() } }],
            },
          },
        },
      }),
    });
  }),
];
