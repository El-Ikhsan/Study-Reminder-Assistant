import { Hono } from 'hono'
import { getTelemetry } from './sensor.controller'

const sensorRoutes = new Hono()

sensorRoutes.get('/:deviceId', getTelemetry)

export default sensorRoutes