import TranslateService from '../services/translate-service';
import { Server } from 'hapi-latest';

export default function translate(server: Server, service: TranslateService) {
  server.route({
    path: '/api/sql_console/translate',
    method: 'POST',
    handler: service.translateQuery
  });
}
