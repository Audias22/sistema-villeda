import os
import threading
import requests
import time
from flask import jsonify
from flask_jwt_extended import jwt_required
from app import create_app
from app.common.decorators import require_permission

app = create_app()

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'message': 'Villeda Legal System funcionando'}), 200

@app.route('/api/v1/test/protegido')
@require_permission('ver_dashboard')
def test_protegido():
    return jsonify({'mensaje': 'Acceso concedido — tienes permiso ver_dashboard'}), 200

def ping_propio():
    while True:
        time.sleep(840)  # cada 14 minutos
        try:
            url = os.getenv('SELF_PING_URL', 'https://sistema-villeda-backend-v2.onrender.com/health')
            requests.get(url)
        except:
            pass

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    if os.getenv('FLASK_ENV') == 'production':
        threading.Thread(target=ping_propio, daemon=True).start()
    app.run(host='0.0.0.0', port=port, debug=debug_mode)