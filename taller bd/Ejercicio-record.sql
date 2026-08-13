declare
    type boleta_cliente is record (
        nombre_cliente cliente.nombre%type,
        estado_de_reserva reserva_temporal.estado%type,
        monto_bruto transaccion_pago.MONTO_BRUTO%type,
        descuento transaccion_pago.DESCUENTO%type,
        monto_final transaccion_pago.MONTO_FINAL%type,
        estado_de_pago transaccion_pago.ESTADO%type
    );
    
    v_boleta boleta_cliente;

begin
    select c.nombre , tr.estado AS estado_de_reserva, tp.MONTO_BRUTO, tp.DESCUENTO, tp.MONTO_FINAL,
    tp.ESTADO as estado_De_pago into v_boleta.nombre_cliente, v_boleta.estado_de_reserva, from cliente c
    join reserva_temporal tr on c.cliente_id = tr.cliente_id
    join transaccion_pago tp on tr.reserva_id = tp.reserva_id
    where tp.transaccion_id = 1;
end;