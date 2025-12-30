import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Notification } from '../types';
import { markNotificationsAsRead }