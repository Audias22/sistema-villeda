import os
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

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)