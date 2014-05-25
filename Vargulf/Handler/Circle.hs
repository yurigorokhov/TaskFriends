module Handler.Circle where

import Import

getCircleR :: String -> Handler Value
getCircleR name = do
	return $ object ["circle" .= name]

postCircleR :: String -> Handler Html
postCircleR = error "Not yet implemented: postCircleR"
