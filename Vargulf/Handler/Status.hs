module Handler.Status where

import Import
import Data.Aeson ()

getStatusR :: Handler Value
getStatusR = do
	return $ object ["status" .= String "OK"]